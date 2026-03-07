"use client";

import { type TouchEvent, useEffect, useRef, useState } from "react";
import AIChat from "@/components/ui/ai-chat";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [bgIndex, setBgIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const backgrounds = ["/caract.mp4", "/moto.mp4", "/car.mp4"];

  const onLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < 40) return;

    if (delta < 0) {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
      return;
    }

    setBgIndex((prev) => (prev - 1 + backgrounds.length) % backgrounds.length);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [backgrounds.length]);

  return (
    <main
      className="relative min-h-screen overflow-hidden text-cyan-100 px-4 py-10 md:px-8"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={backgrounds[bgIndex]}
        autoPlay
        muted
        loop
        playsInline
        key={backgrounds[bgIndex]}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.28),rgba(15,23,42,0.9)_45%,rgba(2,6,23,0.96))]" />
      <div className="landing-glow-animated absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="landing-glow-animated absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="landing-grid-animated absolute inset-0 opacity-35 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:42px_42px]" />

      {!isPending && session ? (
        <div className="fixed right-4 top-4 z-20">
          <button
            onClick={onLogout}
            className="rounded-xl border border-cyan-700 bg-slate-900/90 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-slate-800"
          >
            Ciao
          </button>
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-6 flex justify-center gap-2">
          {backgrounds.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setBgIndex(idx)}
              aria-label={`Background ${idx + 1}`}
              className={`h-2.5 w-10 rounded-full transition ${bgIndex === idx ? "bg-cyan-300" : "bg-cyan-900/70"}`}
            />
          ))}
        </div>
        <h1 className="landing-enter text-center text-4xl md:text-6xl font-extrabold tracking-tight mb-8">
          Welcome
        </h1>
        <div className="landing-enter-delay rounded-2xl border border-cyan-900 bg-slate-900/70 p-4 md:p-6 shadow-2xl">
          <AIChat />
        </div>
      </div>
    </main>
  );
}
