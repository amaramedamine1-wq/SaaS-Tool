import { existsSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refundGenerationQuota } from "@/lib/usage";
import { persistVideoForOperation } from "@/lib/video-storage";

const bodySchema = z.object({
  operationName: z.string().min(10),
});

function getStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeBase64(value: string): string {
  return value.replace(/^data:video\/mp4;base64,/i, "").replace(/\s+/g, "");
}

function isLikelyBase64(value: string): boolean {
  const normalized = normalizeBase64(value);
  if (normalized.length < 128) return false;
  return /^[A-Za-z0-9+/=]+$/.test(normalized);
}

function collectCandidateStrings(value: unknown, out: string[]) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCandidateStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectCandidateStrings(entry, out);
    }
  }
}

function collectCandidateBase64ByKey(value: unknown, out: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectCandidateBase64ByKey(item, out);
    return;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (
      typeof entry === "string" &&
      (lowerKey.includes("bytesbase64") || lowerKey.includes("base64bytes") || lowerKey.includes("base64"))
    ) {
      out.push(entry);
    }
    collectCandidateBase64ByKey(entry, out);
  }
}

function extractVideoUrls(payload: unknown): { videoUrl: string; videoGcsUri: string; videoBytesBase64: string } {
  const p = payload as
    | {
        response?: {
          videos?: Array<{
            uri?: string;
            gcsUri?: string;
            signedUri?: string;
            bytesBase64Encoded?: string;
            videoBytesBase64?: string;
          }>;
          predictions?: Array<{
            uri?: string;
            gcsUri?: string;
            signedUri?: string;
            bytesBase64Encoded?: string;
            videoBytesBase64?: string;
          }>;
        };
      }
    | undefined;

  const firstVideo = p?.response?.videos?.[0] ?? p?.response?.predictions?.[0] ?? {};
  const signed = getStringOrEmpty(firstVideo.signedUri);
  const http = getStringOrEmpty(firstVideo.uri);
  const gcs = getStringOrEmpty(firstVideo.gcsUri);
  const inlineBytes =
    getStringOrEmpty(firstVideo.bytesBase64Encoded) || getStringOrEmpty(firstVideo.videoBytesBase64);

  const candidates: string[] = [];
  collectCandidateStrings(payload, candidates);
  const httpCandidate =
    candidates.find(
      (item) => item.startsWith("https://") && (item.includes(".mp4") || item.includes("signed") || item.includes("video")),
    ) ?? candidates.find((item) => item.startsWith("https://"));
  const gcsCandidate = candidates.find((item) => item.startsWith("gs://"));
  const base64Candidates: string[] = [];
  collectCandidateBase64ByKey(payload, base64Candidates);
  const base64Candidate = base64Candidates.find((item) => isLikelyBase64(item));

  return {
    videoUrl: signed || (http.startsWith("http") ? http : "") || httpCandidate || "",
    videoGcsUri: gcs || gcsCandidate || "",
    videoBytesBase64: isLikelyBase64(inlineBytes) ? normalizeBase64(inlineBytes) : base64Candidate ? normalizeBase64(base64Candidate) : "",
  };
}

function buildVideoProxyUrl(videoGcsUri: string) {
  if (!videoGcsUri) return "";
  return `/api/generate-video/file?gcsUri=${encodeURIComponent(videoGcsUri)}`;
}

function getGenerationReason(details: unknown) {
  const payload = details as
    | {
        error?: { message?: string };
        response?: { raiMediaFilteredCount?: number; filteredReason?: string };
      }
    | undefined;
  if (typeof payload?.error?.message === "string" && payload.error.message.trim()) {
    return payload.error.message.trim();
  }
  if ((payload?.response?.raiMediaFilteredCount ?? 0) > 0) {
    return "Blocked by safety filter (RAI).";
  }
  if (typeof payload?.response?.filteredReason === "string" && payload.response.filteredReason.trim()) {
    return payload.response.filteredReason.trim();
  }
  return "";
}

async function getAccessToken() {
  const googleAuth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const authClient = await googleAuth.getClient();
  const token = await authClient.getAccessToken();
  const accessToken = typeof token === "string" ? token : token?.token;
  if (!accessToken) {
    throw new Error("Failed to get Google access token.");
  }

  return accessToken;
}

function getModelBaseURL(project: string, location: string, model: string) {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}`;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const generation = await prisma.generation
    .findUnique({
      where: { operationName: parsed.data.operationName },
      select: { userId: true, status: true },
    })
    .catch(() => null);

  if (generation && generation.userId !== session.user.id) {
    return NextResponse.json({ error: "Operation not found." }, { status: 404 });
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const model = process.env.VERTEX_VIDEO_MODEL ?? "veo-3.0-generate-preview";
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";

  if (!project) {
    return NextResponse.json({ error: "GOOGLE_CLOUD_PROJECT is missing." }, { status: 500 });
  }

  if (credentialsPath.includes("dein-service-account.json") || (credentialsPath && !existsSync(credentialsPath))) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  try {
    const accessToken = await getAccessToken();
    const baseUrl = getModelBaseURL(project, location, model);

    const pollRes = await fetch(`${baseUrl}:fetchPredictOperation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ operationName: parsed.data.operationName }),
    });

    const pollPayload = await pollRes.json().catch(() => ({}));
    if (!pollRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch video operation.",
          details: pollPayload,
        },
        { status: 502 },
      );
    }

    const done = Boolean((pollPayload as { done?: boolean }).done);
    const urls = extractVideoUrls(pollPayload);
    let persistedVideoUrl = "";
    let persistError = "";
    if (done && (urls.videoUrl || urls.videoGcsUri || urls.videoBytesBase64)) {
      try {
        persistedVideoUrl = await persistVideoForOperation({
          operationName: parsed.data.operationName,
          videoUrl: urls.videoUrl || undefined,
          videoGcsUri: urls.videoGcsUri || undefined,
          videoBytesBase64: urls.videoBytesBase64 || undefined,
          accessToken,
        });
      } catch (error) {
        persistError = error instanceof Error ? error.message : "unknown persist error";
      }
    }
    const reason = done ? getGenerationReason(pollPayload) : "";
    let generationStatus = done
      ? persistedVideoUrl || urls.videoUrl || urls.videoGcsUri || urls.videoBytesBase64
        ? "completed"
        : "blocked"
      : "processing";
    let quotaRefunded = false;
    if (generationStatus === "blocked" && generation?.status !== "blocked_refunded") {
      await refundGenerationQuota(session.user.id, "video").catch(() => undefined);
      quotaRefunded = true;
      generationStatus = "blocked_refunded";
    }

    await prisma.$executeRaw`
      UPDATE "public"."Generation"
      SET
        "status" = ${generationStatus},
        "reason" = ${reason || null},
        "videoUrl" = ${urls.videoUrl || null},
        "videoGcsUri" = ${urls.videoGcsUri || null},
        "persistedVideoUrl" = ${persistedVideoUrl || null},
        "updatedAt" = NOW()
      WHERE "operationName" = ${parsed.data.operationName}
    `.catch(() => undefined);

    return NextResponse.json({
      done,
      videoUrl: urls.videoUrl || undefined,
      videoGcsUri: urls.videoGcsUri || undefined,
      persistedVideoUrl: persistedVideoUrl || undefined,
      videoProxyUrl: !urls.videoUrl && urls.videoGcsUri ? buildVideoProxyUrl(urls.videoGcsUri) : undefined,
      quotaRefunded,
      details: done ? pollPayload : undefined,
      debug: {
        done,
        hasVideoUrl: Boolean(urls.videoUrl),
        hasVideoGcsUri: Boolean(urls.videoGcsUri),
        hasPersistedVideoUrl: Boolean(persistedVideoUrl),
        persistError: persistError || undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to call Vertex AI.",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
