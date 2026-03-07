"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import AnimatedLiquidBackground from "@/components/ui/animated-liquid-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc,#eef2ff)] p-5 md:p-8">
      <AnimatedLiquidBackground />

      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-black/10 bg-white/75 shadow-2xl backdrop-blur-sm md:grid-cols-2">
        <section className="relative hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-cyan-100" />
          <div className="relative flex h-full flex-col justify-between p-10">
            <div>
              <p className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                Join Platform
              </p>
              <h1 className="mt-6 max-w-sm text-5xl font-black leading-tight text-slate-900">
                Erstelle deinen Account.
              </h1>
              <p className="mt-4 max-w-md text-base text-slate-700">
                Richte deinen Zugang ein und nutze den AI-Menue-Assistenten mit sicherer Better-Auth Anmeldung.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/80 p-5">
              <p className="text-sm text-slate-700">
                Registrierung mit Session-Schutz, Password-Reset und Rollenverwaltung.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 md:p-10">
          <Card className="w-full max-w-md border-black/10 bg-white/95 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl font-bold">Registrieren</CardTitle>
              <CardDescription>Lege deinen neuen Account an.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Dein Name"
                      className="h-11 pl-10"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@firma.de"
                      className="h-11 pl-10"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mindestens 8 Zeichen"
                      className="h-11 pl-10 pr-12"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black"
                      aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading || isPending}>
                  {loading ? "Registrierung laeuft..." : "Account erstellen"}
                </Button>

                <p className="text-center text-sm text-slate-600">
                  Schon registriert?{" "}
                  <Link href="/login" className="font-semibold text-black hover:underline">
                    Zum Login
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
