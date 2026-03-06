"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await authClient.signUp.email({
      name,
      email,
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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
        <h1 className="text-3xl font-bold">Registrieren</h1>
        <input
          type="text"
          placeholder="Name"
          className="w-full border border-gray-300 rounded-xl p-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          type="email"
          placeholder="E-Mail"
          className="w-full border border-gray-300 rounded-xl p-3"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Passwort"
          className="w-full border border-gray-300 rounded-xl p-3"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-xl p-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Bitte warten..." : "Registrieren"}
        </button>
        <p className="text-sm text-gray-600">
          Schon ein Account?{" "}
          <Link className="hover:underline" href="/login">
            Zum Login
          </Link>
        </p>
      </form>
    </main>
  );
}
