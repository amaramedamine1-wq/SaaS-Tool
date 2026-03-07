"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const result = await authClient.resetPassword({
      token,
      newPassword: password,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Reset fehlgeschlagen.");
      return;
    }

    setMessage("Passwort aktualisiert. Du kannst dich jetzt einloggen.");
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Passwort zuruecksetzen</h2>
        <p className="mt-1 text-sm text-black/70">Lege ein neues Passwort fuer deinen Account fest.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {!token ? <p className="rounded-md border border-red-400/35 bg-red-950/40 px-3 py-2 text-sm text-red-200">Token fehlt. Oeffne den Link aus der E-Mail erneut.</p> : null}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-black/85">
            Neues Passwort
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/60" />
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              className="h-11 border-black/25 bg-white/70 pl-10 text-black placeholder:text-black/55"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={!token}
            />
          </div>
        </div>

        {error ? <p className="rounded-md border border-red-400/35 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        {message ? <p className="rounded-md border border-emerald-500/35 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

        <Button
          type="submit"
          disabled={loading || !token}
          className="h-11 w-full border border-white/20 bg-white text-black font-semibold transition hover:bg-[#25f4ee]"
        >
          {loading ? "Bitte warten..." : "Passwort speichern"}
        </Button>

        <p className="text-center text-sm text-black/75">
          <Link className="font-semibold text-black hover:text-sky-600" href="/login">
            Zum Login
          </Link>
        </p>
      </form>
    </>
  );
}
