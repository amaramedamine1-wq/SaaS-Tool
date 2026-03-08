"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Asset = {
  id: string;
  kind: "photo" | "video";
  prompt: string;
  url: string;
};

type UsageState = {
  plan: string;
  image: { used: number; limit: number };
  video: { used: number; limit: number };
} | null;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function extractSuggestions(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+[\).\-\s]+/, "").trim())
    .filter((line) => line.length >= 8);

  if (lines.length >= 2) {
    return lines.slice(0, 6);
  }

  const sentenceParts = text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);

  return sentenceParts.slice(0, 4);
}

export default function AIChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ kind: "photo" | "video"; prompt: string } | null>(null);
  const [usage, setUsage] = useState<UsageState>(null);
  const [videoDebug, setVideoDebug] = useState("");
  const assetsRef = useRef<HTMLDivElement | null>(null);
  const isGenerating = generating !== null || busyActionKey !== null;

  useEffect(() => {
    if (!assets.length) return;
    assetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [assets.length]);

  useEffect(() => {
    const loadUsage = async () => {
      const res = await fetch("/api/usage/me");
      if (!res.ok) return;
      const data = await res.json();
      setUsage({
        plan: String(data.plan ?? "free"),
        image: {
          used: Number(data.image?.used ?? 0),
          limit: Number(data.image?.limit ?? 0),
        },
        video: {
          used: Number(data.video?.used ?? 0),
          limit: Number(data.video?.limit ?? 0),
        },
      });
    };

    void loadUsage();
  }, []);

  const refreshUsage = async () => {
    const res = await fetch("/api/usage/me");
    if (!res.ok) return;
    const data = await res.json();
    setUsage({
      plan: String(data.plan ?? "free"),
      image: {
        used: Number(data.image?.used ?? 0),
        limit: Number(data.image?.limit ?? 0),
      },
      video: {
        used: Number(data.video?.used ?? 0),
        limit: Number(data.video?.limit ?? 0),
      },
    });
  };

  const formatApiError = (payload: Record<string, unknown>, fallback: string) => {
    const base = typeof payload.error === "string" && payload.error ? payload.error : fallback;
    const details =
      typeof payload.details === "string"
        ? payload.details
        : payload.details
          ? JSON.stringify(payload.details)
          : "";
    const hint = typeof payload.hint === "string" ? payload.hint : "";
    return [base, details, hint].filter(Boolean).join(" ");
  };

  const getNoPlayableVideoReason = (payload: Record<string, unknown>) => {
    const details = payload.details as
      | {
          error?: { message?: string };
          response?: { raiMediaFilteredCount?: number; filteredReason?: string };
        }
      | undefined;

    const errorMessage = details?.error?.message;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
      return errorMessage.trim();
    }

    if ((details?.response?.raiMediaFilteredCount ?? 0) > 0) {
      return "Blocked by safety filter (RAI). Try a safer prompt.";
    }

    const filteredReason = details?.response?.filteredReason;
    if (typeof filteredReason === "string" && filteredReason.trim()) {
      return filteredReason.trim();
    }

    return "";
  };

  const getVideoDebugLine = (payload: Record<string, unknown>) => {
    const debug = payload.debug as
      | {
          hasVideoUrl?: boolean;
          hasVideoGcsUri?: boolean;
          hasPersistedVideoUrl?: boolean;
          persistError?: string;
        }
      | undefined;
    if (!debug) return "";

    const parts = [
      `hasVideoUrl=${Boolean(debug.hasVideoUrl)}`,
      `hasVideoGcsUri=${Boolean(debug.hasVideoGcsUri)}`,
      `hasPersistedVideoUrl=${Boolean(debug.hasPersistedVideoUrl)}`,
    ];
    if (debug.persistError) {
      parts.push(`persistError=${debug.persistError}`);
    }
    return parts.join(", ");
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoadingSuggestions(true);
    setError("");
    setStatus("");

    const res = await fetch("/api/ai-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim() }),
    });

    if (res.status === 401) {
      setLoadingSuggestions(false);
      setError("Session expired. Please sign in again.");
      return;
    }

    if (!res.ok) {
      setLoadingSuggestions(false);
      setError("Failed to load suggestions.");
      return;
    }

    const data = await res.json();
    const answerText = String(data.answer ?? "");
    setAnswer(answerText);

    const list = Array.isArray(data.suggestions)
      ? data.suggestions.map((item: unknown) => String(item).trim()).filter(Boolean)
      : extractSuggestions(answerText);
    setSuggestions(list);

    setLoadingSuggestions(false);
  };

  const handleUseSuggestion = (suggestion: string) => {
    setQuestion(suggestion);
  };

  const generatePhoto = async (prompt: string, actionKey: string) => {
    setBusyActionKey(actionKey);
    setGenerating({ kind: "photo", prompt });
    setStatus("");
    setError("");

    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1024x1024" }),
    });

    if (res.status === 401) {
      setError("Session expired. Please sign in again.");
      setBusyActionKey(null);
      setGenerating(null);
      return;
    }

    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    setVideoDebug(JSON.stringify(payload, null, 2));
    if (!res.ok) {
      setError(formatApiError(payload, "Photo generation failed."));
      setBusyActionKey(null);
      setGenerating(null);
      await refreshUsage();
      return;
    }

    const imageUrl = String(payload.imageDataUrl ?? "");
    if (!imageUrl) {
      setError("Photo generation failed.");
      setBusyActionKey(null);
      setGenerating(null);
      return;
    }

    setAssets((prev) => [
      {
        id: `${Date.now()}-photo`,
        kind: "photo",
        prompt,
        url: imageUrl,
      },
      ...prev,
    ]);
    setStatus("Photo generated and shown below.");
    setBusyActionKey(null);
    setGenerating(null);
    await refreshUsage();
  };

  const generateVideo = async (prompt: string, actionKey: string) => {
    setBusyActionKey(actionKey);
    setGenerating({ kind: "video", prompt });
    setStatus("");
    setError("");

    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, durationSeconds: 6 }),
    });

    if (res.status === 401) {
      setError("Session expired. Please sign in again.");
      setBusyActionKey(null);
      setGenerating(null);
      return;
    }

    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      setError(formatApiError(payload, "Video generation failed."));
      setBusyActionKey(null);
      setGenerating(null);
      await refreshUsage();
      return;
    }

    const videoUrl = String(payload.persistedVideoUrl ?? payload.videoUrl ?? payload.videoProxyUrl ?? "");
    const operationName = typeof payload.operationName === "string" ? payload.operationName : "";
    const done = Boolean(payload.done);

    if (videoUrl) {
      setAssets((prev) => [
        {
          id: `${Date.now()}-video`,
          kind: "video",
          prompt,
          url: videoUrl,
        },
        ...prev,
      ]);
      setStatus(done ? "Video generated and shown below." : "Video job submitted. Preview shown below.");
      setBusyActionKey(null);
      setGenerating(null);
      await refreshUsage();
      return;
    }

    if (!operationName) {
      setStatus("Video job submitted.");
      setBusyActionKey(null);
      setGenerating(null);
      await refreshUsage();
      return;
    }

    const maxPolls = 24;
    const pollEveryMs = 5000;
    setStatus("Video job submitted. Rendering video...");

    let lastReason = "";
    let lastGcsUri = "";
    let doneWithoutUrlCount = 0;

    for (let i = 0; i < maxPolls; i += 1) {
      await sleep(pollEveryMs);

      const statusRes = await fetch("/api/generate-video/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
      });

      const statusPayload = (await statusRes.json().catch(() => ({}))) as Record<string, unknown>;
      setVideoDebug(JSON.stringify(statusPayload, null, 2));
      if (!statusRes.ok) {
        setError(formatApiError(statusPayload, "Failed to fetch video status."));
        setBusyActionKey(null);
        setGenerating(null);
        await refreshUsage();
        return;
      }

      const statusDone = Boolean(statusPayload.done);
      const statusVideoUrl = String(statusPayload.persistedVideoUrl ?? statusPayload.videoUrl ?? statusPayload.videoProxyUrl ?? "");
      if (!statusDone) {
        setStatus(`Rendering video... ${i + 1}/${maxPolls}`);
        continue;
      }

      if (statusVideoUrl) {
        setAssets((prev) => [
          {
            id: `${Date.now()}-video`,
            kind: "video",
            prompt,
            url: statusVideoUrl,
          },
          ...prev,
        ]);
        setStatus("Video generated and shown below.");
        setBusyActionKey(null);
        setGenerating(null);
        await refreshUsage();
        return;
      } else {
        const gcsUri = String(statusPayload.videoGcsUri ?? "");
        const reason = getNoPlayableVideoReason(statusPayload);
        const debugLine = getVideoDebugLine(statusPayload);
        lastReason = reason;
        lastGcsUri = gcsUri;
        doneWithoutUrlCount += 1;
        if (doneWithoutUrlCount >= 4) {
          setStatus(
            reason
              ? `Video finished but no playable URL. Reason: ${reason}`
              : "Video finished but no playable URL.",
          );
          setBusyActionKey(null);
          setGenerating(null);
          await refreshUsage();
          return;
        }
        setStatus(
          debugLine
            ? `Finalizing video file... ${i + 1}/${maxPolls} (${debugLine})`
            : `Finalizing video file... ${i + 1}/${maxPolls}`,
        );
        continue;
      }
    }

    setStatus(
      lastGcsUri
        ? "Video generated in storage, but playback URL is still not ready. Try again in a moment."
        : lastReason
          ? `Video generated, but no playable URL returned. Reason: ${lastReason}`
          : "Video generated, but no playable URL returned.",
    );
    setBusyActionKey(null);
    setGenerating(null);
    await refreshUsage();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {usage ? (
        <div className="mb-4 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
          <div className="rounded-md border border-cyan-900/40 bg-slate-900/60 px-3 py-2 text-cyan-100">
            Plan: <span className="font-semibold uppercase">{usage.plan}</span>
          </div>
          <div className="rounded-md border border-cyan-900/40 bg-slate-900/60 px-3 py-2 text-cyan-100">
            Free images left:{" "}
            <span className="font-semibold">{Math.max(usage.image.limit - usage.image.used, 0)}</span>
          </div>
          <div className="rounded-md border border-cyan-900/40 bg-slate-900/60 px-3 py-2 text-cyan-100">
            Free videos left:{" "}
            <span className="font-semibold">{Math.max(usage.video.limit - usage.video.used, 0)}</span>
          </div>
        </div>
      ) : null}

      <Textarea
        placeholder="Enter a topic, e.g. Cinematic car chase at night"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="mb-4"
        disabled={isGenerating}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAsk} disabled={loadingSuggestions || isGenerating}>
          {loadingSuggestions ? "Loading..." : "Show suggestions"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!question.trim() || isGenerating}
          onClick={() => generatePhoto(question.trim(), "custom-photo")}
        >
          {busyActionKey === "custom-photo" ? "Generating..." : "Generate photo"}
        </Button>
        <Button
          type="button"
          disabled={!question.trim() || isGenerating}
          onClick={() => generateVideo(question.trim(), "custom-video")}
        >
          {busyActionKey === "custom-video" ? "Generating..." : "Generate video"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-emerald-400">{status}</p> : null}
      {videoDebug ? (
        <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-cyan-900/40 bg-slate-950/70 p-3 text-[11px] text-cyan-200">
          {videoDebug}
        </pre>
      ) : null}

      {answer ? (
        <div className="mt-4 rounded-lg bg-gray-100 p-4 whitespace-pre-line text-slate-900">
          {answer}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {suggestions.map((suggestion, index) => {
            const photoKey = `s-${index}-photo`;
            const videoKey = `s-${index}-video`;

            return (
              <div key={`${index}-${suggestion.slice(0, 24)}`} className="rounded-lg border border-cyan-900/40 bg-slate-900/50 p-3">
                <p className="text-sm text-cyan-100">{suggestion}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => handleUseSuggestion(suggestion)}>
                    Use in chat
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => generatePhoto(suggestion, photoKey)}
                    disabled={isGenerating}
                  >
                    {busyActionKey === photoKey ? "Generating..." : "Generate photo"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => generateVideo(suggestion, videoKey)}
                    disabled={isGenerating}
                  >
                    {busyActionKey === videoKey ? "Generating..." : "Generate video"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {generating ? (
        <div className="mt-6 rounded-lg border border-cyan-900/40 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-cyan-200">
            Generating {generating.kind}...
          </p>
          <p className="mt-1 text-xs text-cyan-100/80">{generating.prompt}</p>
          <div className="mt-3 h-40 animate-pulse rounded-md border border-cyan-900/50 bg-slate-800/70" />
        </div>
      ) : null}

      {assets.length > 0 ? (
        <div ref={assetsRef} className="mt-6 space-y-4">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-lg border border-cyan-900/40 bg-slate-900/60 p-3">
              <p className="mb-2 text-xs text-cyan-200/85">{asset.prompt}</p>
              {asset.kind === "photo" ? (
                <Image
                  src={asset.url}
                  alt="Generated"
                  width={1024}
                  height={1024}
                  unoptimized
                  className="h-auto w-full rounded-md border border-cyan-900/50"
                />
              ) : (
                <video src={asset.url} controls className="w-full rounded-md border border-cyan-900/50" />
              )}
              <a
                href={asset.url}
                download={asset.kind === "photo" ? "generated-photo.png" : "generated-video.mp4"}
                className="mt-2 inline-block text-sm text-cyan-300 hover:text-cyan-200"
              >
                Download {asset.kind}
              </a>
            </div>
          ))}
        </div>
      ) : null}

      {isGenerating ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl border border-cyan-800 bg-slate-950/95 px-6 py-5 text-center shadow-2xl">
            <p className="text-base font-semibold text-cyan-200">Please wait</p>
            <p className="mt-1 text-sm text-cyan-100/80">
              {generating?.kind === "video" ? "Generating video..." : "Generating photo..."}
            </p>
            <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
