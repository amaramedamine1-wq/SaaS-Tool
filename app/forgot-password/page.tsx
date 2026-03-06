"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <h1 className="text-3xl font-bold">Passwort vergessen</h1>
        <input
          type="email"
          placeholder="E-Mail"
          className="w-full border border-gray-300 rounded-xl p-3"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        {message ? <p className="text-green-700 text-sm">{message}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-xl p-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Bitte warten..." : "Reset-Link anfordern"}
        </button>
        <p className="text-sm text-gray-600">
          <Link className="hover:underline" href="/login">
            Zurueck zum Login
          </Link>
        </p>
      </form>
    </main>
  );
}
