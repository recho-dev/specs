import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { SPEC_SYSTEM_PROMPT, buildSpecMessages } from "@/lib/prompts";
import type { SpecResponse } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  examples: z.array(z.object({ id: z.string(), name: z.string(), code: z.string() })).min(1),
  refinementInstruction: z.string(),
  conversationHistory: z.array(z.object({ question: z.string(), answer: z.string() })),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SPEC_SYSTEM_PROMPT,
    messages: buildSpecMessages(body),
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  try {
    const parsed = JSON.parse(text) as SpecResponse;
    return Response.json(parsed);
  } catch {
    // Fallback: treat as clean update with original examples
    return Response.json({ type: "update", examples: body.examples } satisfies SpecResponse);
  }
}
