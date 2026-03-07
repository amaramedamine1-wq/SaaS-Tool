"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = useState(0.2);

  const isFormValid = useMemo(() => email.trim().length > 3 && password.length >= 8, [email, password]);

  useEffect(() => {
    if (!isPending && session) router.replace("/");
  }, [isPending, session, router]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setError("Bitte gib eine gueltige E-Mail und ein Passwort mit mindestens 8 Zeichen ein.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await authClient.signIn.email({
      email: email.trim(),
      password,
      callbackURL: "/",
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Login fehlgeschlagen.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black text-black">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.1))] md:block" />
      <div className="flex flex-col md:flex-row min-h-screen">
        <div className="relative w-full md:w-1/2 h-[40vh] md:h-auto overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.playbackRate = speed;
            }}
            onError={() => setVideoError(true)}
          >
            <source src="/moto.mp4" type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-black/12" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(36,244,238,0.08),transparent_35%),radial-gradient(circle_at_20%_75%,rgba(254,44,85,0.06),transparent_40%)]" />

          <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-md bg-black/40 px-2 py-1 text-sm text-white/90">
            <span className="mr-2">Speed</span>
            <button
              type="button"
              onClick={() => setSpeed(0.25)}
              className={`rounded px-2 py-1 text-xs hover:bg-white/10 ${speed === 0.25 ? 'bg-white/10 font-semibold' : ''}`}
            >
              0.25x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(0.5)}
              className={`rounded px-2 py-1 text-xs hover:bg-white/10 ${speed === 0.5 ? 'bg-white/10 font-semibold' : ''}`}
            >
              0.5x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(0.75)}
              className={`rounded px-2 py-1 text-xs hover:bg-white/10 ${speed === 0.75 ? 'bg-white/10 font-semibold' : ''}`}
            >
              0.75x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(1)}
              className={`rounded px-2 py-1 text-xs hover:bg-white/10 ${speed === 1 ? 'bg-white/10 font-semibold' : ''}`}
            >
              1x
            </button>
            <div className="ml-2 text-xs text-white/70">{speed.toFixed(2)}x</div>
          </div>

          {videoError ? (
            <div className="absolute left-4 bottom-4 z-20 rounded-md border border-red-400/40 bg-black/70 px-3 py-2 text-sm text-red-200">
              Video fehlt: <code>/public/moto.mp4</code>
            </div>
          ) : null}
        </div>

        <section className="relative flex w-full md:w-1/2 items-center justify-center overflow-hidden px-4 py-12 bg-[linear-gradient(165deg,#dce9ff,#cddcf7)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="cloud cloud-a" />
            <div className="cloud cloud-b" />
            <div className="cloud cloud-c" />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/50 bg-white/45 p-6 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.2)] md:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold">Login</h2>
            <p className="mt-1 text-sm text-black/70">Melde dich an und starte direkt.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black/85">
                E-Mail
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/60" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@firma.de"
                  className="h-11 border-black/25 bg-white/70 pl-10 text-black placeholder:text-black/55"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-black/85">
                  Passwort
                </Label>
                <Link href="/forgot-password" className="text-xs text-black/65 hover:text-black">
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Mindestens 8 Zeichen"
                  className="h-11 border-black/25 bg-white/70 pl-10 pr-12 text-black placeholder:text-black/55"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/55 hover:text-black"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-400/35 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full border border-white/20 bg-white text-black font-semibold transition hover:bg-[#25f4ee]"
              disabled={loading || isPending}
            >
              {loading ? "Anmeldung laeuft..." : "Einloggen"}
            </Button>

            <p className="text-center text-sm text-black/75">
              Noch kein Account?{" "}
              <Link href="/register" className="font-semibold text-black hover:text-sky-600">
                Jetzt registrieren
              </Link>
            </p>
          </form>
        </div>
      </section>
      </div>

      <style jsx>{`
        .cloud {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 35%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.65));
          filter: blur(10px);
          opacity: 0.7;
        }
        .cloud-a {
          width: 340px;
          height: 120px;
          top: 10%;
          left: -120px;
          animation: driftA 26s linear infinite;
        }
        .cloud-b {
          width: 420px;
          height: 145px;
          top: 42%;
          left: -180px;
          animation: driftB 34s linear infinite;
        }
        .cloud-c {
          width: 300px;
          height: 110px;
          bottom: 10%;
          left: -140px;
          animation: driftC 30s linear infinite;
        }
        @keyframes driftA {
          from { transform: translateX(0); }
          to { transform: translateX(130%); }
        }
        @keyframes driftB {
          from { transform: translateX(0); }
          to { transform: translateX(150%); }
        }
        @keyframes driftC {
          from { transform: translateX(0); }
          to { transform: translateX(140%); }
        }
      `}</style>
    </main>
  );
}
