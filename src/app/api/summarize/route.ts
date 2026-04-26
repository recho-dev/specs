import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const versionedExampleSchema = z.object({ id: z.string(), name: z.string(), code: z.string() });

const bodySchema = z.object({
  refinementPrompt: z.string(),
  previousLibraryCode: z.string(),
  currentLibraryCode: z.string(),
  previousExamples: z.array(versionedExampleSchema),
  currentExamples: z.array(versionedExampleSchema),
});

function buildDiffSummary(body: z.infer<typeof bodySchema>): string {
  const parts: string[] = [];

  if (body.refinementPrompt) {
    parts.push(`User instruction: "${body.refinementPrompt}"`);
  }

  const prevExMap = new Map(body.previousExamples.map((e) => [e.id, e]));
  const currExMap = new Map(body.currentExamples.map((e) => [e.id, e]));

  const added = body.currentExamples.filter((e) => !prevExMap.has(e.id));
  const removed = body.previousExamples.filter((e) => !currExMap.has(e.id));
  const changed = body.currentExamples.filter((e) => {
    const prev = prevExMap.get(e.id);
    return prev && prev.code !== e.code;
  });

  if (added.length) parts.push(`Added examples: ${added.map((e) => e.name).join(", ")}`);
  if (removed.length) parts.push(`Removed examples: ${removed.map((e) => e.name).join(", ")}`);
  if (changed.length) parts.push(`Modified examples: ${changed.map((e) => e.name).join(", ")}`);

  const libChanged = body.previousLibraryCode !== body.currentLibraryCode;
  if (libChanged && !body.previousLibraryCode) {
    parts.push("Initial library generation");
  } else if (libChanged) {
    parts.push("Library code updated");
  }

  return parts.join("\n");
}

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

  const context = buildDiffSummary(body);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    system:
      "You summarize code generation changes in one short phrase (under 8 words). No punctuation at the end. Be specific and concrete. Examples: 'Added animation to bar chart', 'Switched rendering from canvas to SVG', 'Fixed tooltip positioning bug', 'Initial bar chart generation'.",
    messages: [{ role: "user", content: context }],
  });

  const description =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : "Updated";

  return Response.json({ description });
}
