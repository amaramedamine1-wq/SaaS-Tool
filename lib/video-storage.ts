import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

type PersistInput = {
  operationName: string;
  videoUrl?: string;
  videoGcsUri?: string;
  videoBytesBase64?: string;
  accessToken?: string;
};

const PUBLIC_VIDEO_DIR = path.join(process.cwd(), "public", "generated", "videos");

function parseGcsUri(gcsUri: string): { bucket: string; objectPath: string } | null {
  const withoutPrefix = gcsUri.replace(/^gs:\/\//, "");
  const slashIndex = withoutPrefix.indexOf("/");
  if (slashIndex <= 0) return null;

  const bucket = withoutPrefix.slice(0, slashIndex).trim();
  const objectPath = withoutPrefix.slice(slashIndex + 1).trim();
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}

function fileNameForOperation(operationName: string) {
  const hash = createHash("sha1").update(operationName).digest("hex").slice(0, 16);
  return `vertex-${hash}.mp4`;
}

function decodeBase64Video(videoBytesBase64: string) {
  const normalized = videoBytesBase64.replace(/^data:video\/mp4;base64,/i, "").replace(/\s+/g, "");
  if (!normalized) return Buffer.alloc(0);
  return Buffer.from(normalized, "base64");
}

async function ensureVideoDir() {
  await fs.mkdir(PUBLIC_VIDEO_DIR, { recursive: true });
}

async function fetchVideoBufferFromHttp(videoUrl: string) {
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Video URL fetch failed (${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fetchVideoBufferFromGcs(gcsUri: string, accessToken: string) {
  const parts = parseGcsUri(gcsUri);
  if (!parts) throw new Error("Invalid gs:// URI.");

  const storageUrl =
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parts.bucket)}` +
    `/o/${encodeURIComponent(parts.objectPath)}?alt=media`;

  const res = await fetch(storageUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`GCS fetch failed (${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function persistVideoForOperation(input: PersistInput): Promise<string> {
  if (!input.operationName) return "";
  await ensureVideoDir();

  const fileName = fileNameForOperation(input.operationName);
  const filePath = path.join(PUBLIC_VIDEO_DIR, fileName);

  try {
    await fs.access(filePath);
    return `/generated/videos/${fileName}`;
  } catch {
    // File does not exist yet.
  }

  let buffer: Buffer | null = null;
  if (input.videoUrl) {
    buffer = await fetchVideoBufferFromHttp(input.videoUrl);
  } else if (input.videoGcsUri && input.accessToken) {
    buffer = await fetchVideoBufferFromGcs(input.videoGcsUri, input.accessToken);
  } else if (input.videoBytesBase64) {
    const decoded = decodeBase64Video(input.videoBytesBase64);
    buffer = decoded.byteLength > 0 ? decoded : null;
  }

  if (!buffer) return "";

  await fs.writeFile(filePath, buffer);
  return `/generated/videos/${fileName}`;
}
