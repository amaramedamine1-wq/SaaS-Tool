"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import AuthShell from "@/components/ui/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFormValid = useMemo(
    () => name.trim().length >= 2 && email.trim().length > 3 && password.length >= 8,
    [name, email, password],
  );

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/");
    }
  }, [isPending, session, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setError("Bitte gib Name, gueltige E-Mail und ein Passwort mit mindestens 8 Zeichen ein.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
      callbackURL: "/",
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Registrierung fehlgeschlagen.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <AuthShell>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Registrieren</h2>
        <p className="mt-1 text-sm text-black/70">Lege deinen neuen Account an.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-black/85">
            Name
          </Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/60" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Dein Name"
              className="h-11 border-black/25 bg-white/70 pl-10 text-black placeholder:text-black/55"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        </div>

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
          <Label htmlFor="password" className="text-black/85">
            Passwort
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/60" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          {loading ? "Registrierung laeuft..." : "Account erstellen"}
        </Button>

        <p className="text-center text-sm text-black/75">
          Schon registriert?{" "}
          <Link href="/login" className="font-semibold text-black hover:text-sky-600">
            Zum Login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
