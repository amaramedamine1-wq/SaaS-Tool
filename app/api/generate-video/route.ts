import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsageLimitError, consumeGenerationQuota, refundGenerationQuota } from "@/lib/usage";
import { persistVideoForOperation } from "@/lib/video-storage";

const bodySchema = z.object({
  prompt: z.string().min(3).max(1000),
  durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(6),
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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

  let quotaConsumed = false;
  try {
    await consumeGenerationQuota(session.user.id, "video");
    quotaConsumed = true;
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        {
          error: "Monthly video limit reached.",
          code: "LIMIT_REACHED",
          plan: error.plan,
          limit: error.limit,
          used: error.used,
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Failed to validate usage." }, { status: 500 });
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const model = process.env.VERTEX_VIDEO_MODEL ?? "veo-3.0-generate-preview";
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";

  if (!project) {
    return NextResponse.json({ error: "GOOGLE_CLOUD_PROJECT is missing." }, { status: 500 });
  }

  // Allow ADC fallback when service-account key files are blocked by org policy.
  // If env path is a placeholder or missing, ignore it and rely on gcloud ADC login.
  if (credentialsPath.includes("dein-service-account.json") || (credentialsPath && !existsSync(credentialsPath))) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  try {
    const accessToken = await getAccessToken();
    const baseUrl = getModelBaseURL(project, location, model);

    const startRes = await fetch(`${baseUrl}:predictLongRunning`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: parsed.data.prompt,
          },
        ],
        parameters: {
          durationSeconds: parsed.data.durationSeconds,
          sampleCount: 1,
          aspectRatio: "16:9",
        },
      }),
    });

    const startPayload = await startRes.json().catch(() => ({}));
    if (!startRes.ok) {
      if (quotaConsumed) {
        await refundGenerationQuota(session.user.id, "video").catch(() => undefined);
      }
      return NextResponse.json(
        {
          error: "Vertex request failed.",
          details: startPayload,
        },
        { status: 502 },
      );
    }

    const operationName = getStringOrEmpty((startPayload as { name?: string }).name);
    if (!operationName) {
      if (quotaConsumed) {
        await refundGenerationQuota(session.user.id, "video").catch(() => undefined);
      }
      return NextResponse.json(
        { error: "Vertex did not return an operation name.", details: startPayload },
        { status: 502 },
      );
    }

    // Save generation job in DB. Do not fail request if logging fails.
    await prisma.$executeRaw`
      INSERT INTO "public"."Generation"
      ("id","userId","kind","provider","operationName","prompt","status","createdAt","updatedAt")
      VALUES
      (${randomUUID()}, ${session.user.id}, 'video', 'vertex-ai', ${operationName}, ${parsed.data.prompt}, 'submitted', NOW(), NOW())
      ON CONFLICT ("operationName")
      DO UPDATE SET "prompt" = EXCLUDED."prompt", "status" = 'submitted', "updatedAt" = NOW()
    `.catch(() => undefined);

    const pollEnabled = process.env.VERTEX_POLL_ENABLED !== "false";
    const maxPolls = Number(process.env.VERTEX_MAX_POLLS ?? 8);
    const pollIntervalMs = Number(process.env.VERTEX_POLL_INTERVAL_MS ?? 3500);

    let done = false;
    let finalPayload: unknown = null;
    let videoUrl = "";
    let videoGcsUri = "";
    let videoBytesBase64 = "";

    if (pollEnabled) {
      for (let i = 0; i < maxPolls; i += 1) {
        await sleep(pollIntervalMs);

        const pollRes = await fetch(`${baseUrl}:fetchPredictOperation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ operationName }),
        });

        const pollPayload = await pollRes.json().catch(() => ({}));
        if (!pollRes.ok) {
          finalPayload = pollPayload;
          break;
        }

        const isDone = Boolean((pollPayload as { done?: boolean }).done);
        if (!isDone) {
          continue;
        }

        done = true;
        finalPayload = pollPayload;
        const urls = extractVideoUrls(pollPayload);
        videoUrl = urls.videoUrl;
        videoGcsUri = urls.videoGcsUri;
        videoBytesBase64 = urls.videoBytesBase64;
        break;
      }
    }

    let persistedVideoUrl = "";
    let persistError = "";
    if (done && (videoUrl || videoGcsUri || videoBytesBase64)) {
      try {
        persistedVideoUrl = await persistVideoForOperation({
          operationName,
          videoUrl: videoUrl || undefined,
          videoGcsUri: videoGcsUri || undefined,
          videoBytesBase64: videoBytesBase64 || undefined,
          accessToken,
        });
      } catch (error) {
        persistError = error instanceof Error ? error.message : "unknown persist error";
      }
    }
    const reason = done ? getGenerationReason(finalPayload) : "";
    let generationStatus = done
      ? persistedVideoUrl || videoUrl || videoGcsUri || videoBytesBase64
        ? "completed"
        : "blocked"
      : "processing";
    let quotaRefunded = false;
    if (generationStatus === "blocked" && quotaConsumed) {
      await refundGenerationQuota(session.user.id, "video").catch(() => undefined);
      quotaRefunded = true;
      generationStatus = "blocked_refunded";
    }

    await prisma.$executeRaw`
      UPDATE "public"."Generation"
      SET
        "status" = ${generationStatus},
        "reason" = ${reason || null},
        "videoUrl" = ${videoUrl || null},
        "videoGcsUri" = ${videoGcsUri || null},
        "persistedVideoUrl" = ${persistedVideoUrl || null},
        "updatedAt" = NOW()
      WHERE "operationName" = ${operationName}
    `.catch(() => undefined);

    return NextResponse.json({
      accepted: true,
      provider: "vertex-ai",
      project,
      location,
      model,
      operationName,
      done,
      videoUrl: videoUrl || undefined,
      videoGcsUri: videoGcsUri || undefined,
      persistedVideoUrl: persistedVideoUrl || undefined,
      videoProxyUrl: !videoUrl && videoGcsUri ? buildVideoProxyUrl(videoGcsUri) : undefined,
      quotaRefunded,
      details: finalPayload ?? undefined,
      debug: {
        done,
        hasVideoUrl: Boolean(videoUrl),
        hasVideoGcsUri: Boolean(videoGcsUri),
        hasPersistedVideoUrl: Boolean(persistedVideoUrl),
        persistError: persistError || undefined,
      },
      message: done
        ? "Video generated by Vertex AI."
        : "Video job submitted to Vertex AI. Poll again for completion.",
    });
  } catch (error) {
    if (quotaConsumed) {
      await refundGenerationQuota(session.user.id, "video").catch(() => undefined);
    }
    return NextResponse.json(
      {
        error: "Failed to call Vertex AI.",
        details: error instanceof Error ? error.message : "unknown",
        hint:
          "If service-account keys are blocked, run: gcloud auth application-default login",
      },
      { status: 500 },
    );
  }
}
