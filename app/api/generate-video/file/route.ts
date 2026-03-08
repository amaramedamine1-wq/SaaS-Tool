import { existsSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const querySchema = z.object({
  gcsUri: z.string().startsWith("gs://"),
});

function parseGcsUri(gcsUri: string): { bucket: string; objectPath: string } | null {
  const withoutPrefix = gcsUri.replace(/^gs:\/\//, "");
  const slashIndex = withoutPrefix.indexOf("/");
  if (slashIndex <= 0) return null;

  const bucket = withoutPrefix.slice(0, slashIndex).trim();
  const objectPath = withoutPrefix.slice(slashIndex + 1).trim();
  if (!bucket || !objectPath) return null;

  return { bucket, objectPath };
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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    gcsUri: url.searchParams.get("gcsUri"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gcsUri." }, { status: 400 });
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";
  if (credentialsPath.includes("dein-service-account.json") || (credentialsPath && !existsSync(credentialsPath))) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const parts = parseGcsUri(parsed.data.gcsUri);
  if (!parts) {
    return NextResponse.json({ error: "Invalid gcsUri format." }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken();
    const storageUrl =
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parts.bucket)}` +
      `/o/${encodeURIComponent(parts.objectPath)}?alt=media`;

    const upstream = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to fetch video from GCS.", details: details || upstream.statusText },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "video/mp4";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to stream video file.",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
