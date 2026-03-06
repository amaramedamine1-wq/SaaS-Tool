"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AIChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/ai-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (res.status === 401) {
      setLoading(false);
      setError("Session abgelaufen. Bitte erneut einloggen.");
      return;
    }

    if (!res.ok) {
      setLoading(false);
      setError("Anfrage fehlgeschlagen.");
      return;
    }

    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Textarea
        placeholder="Frage: Was gibt es heute vegan?"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="mb-4"
      />

      <Button onClick={handleAsk} disabled={loading}>
        {loading ? "Laedt..." : "Vorschlaege anzeigen"}
      </Button>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {answer ? (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg whitespace-pre-line">
          {answer}
        </div>
      ) : null}
    </div>
  );
}
