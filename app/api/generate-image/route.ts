import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { UsageLimitError, consumeGenerationQuota } from "@/lib/usage";

const bodySchema = z.object({
  prompt: z.string().min(3).max(1000),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"),
});

function getAspectRatio(size: "1024x1024" | "1536x1024" | "1024x1536") {
  if (size === "1536x1024") return "3:2";
  if (size === "1024x1536") return "2:3";
  return "1:1";
}

function getStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function extractImageBase64(payload: unknown): string {
  const p = payload as
    | {
        predictions?: Array<
          | { bytesBase64Encoded?: string }
          | { image?: { bytesBase64Encoded?: string } }
          | { images?: Array<{ bytesBase64Encoded?: string }> }
        >;
      }
    | undefined;

  const first = p?.predictions?.[0];
  if (!first) return "";

  if ("bytesBase64Encoded" in first) {
    return getStringOrEmpty(first.bytesBase64Encoded);
  }
  if ("image" in first) {
    return getStringOrEmpty(first.image?.bytesBase64Encoded);
  }
  if ("images" in first) {
    return getStringOrEmpty(first.images?.[0]?.bytesBase64Encoded);
  }
  return "";
}

async function getAccessToken() {
  const googleAuth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const authClient = await googleAuth.getClient();
  const token = await authClient.getAccessToken();
  const accessToken = token?.token ?? token;

  if (!accessToken) {
    throw new Error("Failed to get Google access token.");
  }

  return accessToken;
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

  try {
    await consumeGenerationQuota(session.user.id, "image");
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        {
          error: "Monthly image limit reached.",
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
  const model = process.env.VERTEX_IMAGE_MODEL ?? "imagen-4.0-generate-001";

  if (!project) {
    return NextResponse.json({ error: "GOOGLE_CLOUD_PROJECT is missing." }, { status: 500 });
  }

  try {
    const accessToken = await getAccessToken();
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

    const imageRes = await fetch(endpoint, {
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
          sampleCount: 1,
          aspectRatio: getAspectRatio(parsed.data.size),
          outputMimeType: "image/png",
        },
      }),
    });

    const payload = await imageRes.json().catch(() => ({}));
    if (!imageRes.ok) {
      return NextResponse.json(
        {
          error: "Vertex image request failed.",
          details: payload,
        },
        { status: 502 },
      );
    }

    const base64 = extractImageBase64(payload);
    if (!base64) {
      return NextResponse.json(
        {
          error: "Image generation failed.",
          details: payload,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${base64}`,
      provider: "vertex-ai",
      model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to call Vertex AI.",
        details: error instanceof Error ? error.message : "unknown",
        hint: "Run: gcloud auth application-default login (for local ADC)",
      },
      { status: 500 },
    );
  }
}
