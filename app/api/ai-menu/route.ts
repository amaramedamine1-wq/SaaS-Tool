import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
});

function extractSuggestions(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+[\).\-\s]+/, "").trim())
    .filter((line) => line.length >= 8);

  if (lines.length >= 2) return lines.slice(0, 6);

  return text
    .split(/[.!?]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8)
    .slice(0, 4);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are an AI prompt generator for image and video creation. Reply in English. Provide 4 to 6 concise cinematic prompts, one per line, based on the user's topic.",
        },
        { role: "user", content: parsed.data.question },
      ],
    });

    const answer = response.output_text?.trim() || "No answer available.";
    const suggestions = extractSuggestions(answer);
    return NextResponse.json({ answer, suggestions });
  } catch {
    return NextResponse.json({ error: "Failed to process AI request." }, { status: 500 });
  }
}
