import type { GenerateRequestBody } from "@/types";
import type Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are a JavaScript library code generator. Your ONLY job is to output the complete, working source code of a JavaScript library.

RULES:
1. Output ONLY valid JavaScript. No markdown, no code fences, no explanation, no preamble.
2. The library runs in a browser <script> context. Do NOT use ES module import/export syntax.
3. Define all exported symbols as globals using var/let/const/class/function declarations at the top level.
4. Do NOT assume any bundler, transpiler, or external dependencies. Use only browser-native APIs (DOM, Canvas, SVG, fetch, etc.).
5. The #container element is always available in the DOM: document.getElementById('container').
6. The library must make ALL provided examples work correctly and simultaneously.
7. Do NOT add features, classes, or functionality not demonstrated in the provided examples. Implement the minimum code needed to make the examples work — nothing more.
8. When fixing errors, address them precisely without breaking passing examples.
9. Keep the library self-contained in a single file — no multi-file splits.`;

export function buildGenerationMessages(body: GenerateRequestBody): Anthropic.MessageParam[] {
  const { examples, currentLibraryCode, refinementInstruction, failedExamples } = body;

  const examplesBlock = examples
    .map((ex, i) => `### Example ${i + 1}: ${ex.name}\n\`\`\`javascript\n${ex.code}\n\`\`\``)
    .join("\n\n");

  const failuresBlock =
    failedExamples.length > 0
      ? "\n\n### Currently Failing Examples (you MUST fix these)\n\n" +
        failedExamples
          .map((f) => `**${f.name}**\nCode:\n\`\`\`javascript\n${f.code}\n\`\`\`\nError: ${f.error}`)
          .join("\n\n")
      : "";

  const currentLibraryBlock =
    currentLibraryCode.trim().length > 0
      ? `\n\n### Current Library Code (you may use this as a reference, but remove anything not needed by the current examples)\n\`\`\`javascript\n${currentLibraryCode}\n\`\`\``
      : "";

  const refinementBlock =
    refinementInstruction.trim().length > 0
      ? `\n\n### User Instruction\n${refinementInstruction}`
      : "";

  // Cache the examples block (stable), keep failures/refinement/current library fresh
  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `## Usage Examples (your library must make ALL of these work)\n\n${examplesBlock}`,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text:
            failuresBlock +
            currentLibraryBlock +
            refinementBlock +
            "\n\n---\nOutput the complete library JavaScript code now:",
        },
      ],
    },
  ];
}
