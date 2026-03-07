import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  contentClassName?: string;
  backgroundVideoSrc?: string;
};

export default function AuthShell({ children, contentClassName, backgroundVideoSrc }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-black">
      {backgroundVideoSrc ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={backgroundVideoSrc}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),rgba(2,6,23,0.95)_46%,rgba(2,6,23,1)_100%)]" />
      <div className="absolute inset-0 opacity-35 bg-[linear-gradient(rgba(34,211,238,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.22)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="moto-glow moto-glow-a" />
      <div className="moto-glow moto-glow-b" />
      <div className="moto-track moto-track-a" />
      <div className="moto-track moto-track-b" />
      <div className="moto-track moto-track-c" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div
          className={cn(
            "w-full max-w-md rounded-3xl border border-white/50 bg-white/45 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8",
            contentClassName,
          )}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
