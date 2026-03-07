"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import AuthShell from "@/components/ui/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Anfrage fehlgeschlagen.");
      return;
    }

    setMessage("Wenn die E-Mail existiert, wurde ein Reset-Link erstellt.");
  };

  return (
    <AuthShell>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Passwort vergessen</h2>
        <p className="mt-1 text-sm text-black/70">Wir senden dir einen Reset-Link per E-Mail.</p>
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
              placeholder="name@firma.de"
              className="h-11 border-black/25 bg-white/70 pl-10 text-black placeholder:text-black/55"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-400/35 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="rounded-md border border-emerald-500/35 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full border border-white/20 bg-white text-black font-semibold transition hover:bg-[#25f4ee]"
        >
          {loading ? "Bitte warten..." : "Reset-Link anfordern"}
        </Button>

        <p className="text-center text-sm text-black/75">
          <Link className="font-semibold text-black hover:text-sky-600" href="/login">
            Zurueck zum Login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
