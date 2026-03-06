"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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
    <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
      <h1 className="text-3xl font-bold">Passwort zuruecksetzen</h1>
      {!token ? <p className="text-red-600 text-sm">Token fehlt. Oeffne den Link aus der E-Mail erneut.</p> : null}
      <input
        type="password"
        placeholder="Neues Passwort"
        className="w-full border border-gray-300 rounded-xl p-3"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        disabled={!token}
      />
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      {message ? <p className="text-green-700 text-sm">{message}</p> : null}
      <button
        type="submit"
        disabled={loading || !token}
        className="w-full bg-black text-white rounded-xl p-3 font-semibold disabled:opacity-60"
      >
        {loading ? "Bitte warten..." : "Passwort speichern"}
      </button>
      <p className="text-sm text-gray-600">
        <Link className="hover:underline" href="/login">
          Zum Login
        </Link>
      </p>
    </form>
  );
}
