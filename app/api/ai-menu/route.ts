import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const bodySchema = z.object({
  question: z.string().min(1).max(500),
});

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
            "You are a restaurant menu assistant. Give short, practical suggestions in German.",
        },
        { role: "user", content: parsed.data.question },
      ],
    });

    const answer = response.output_text?.trim() || "Keine Antwort verfuegbar.";
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "Failed to process AI request." }, { status: 500 });
  }
}
