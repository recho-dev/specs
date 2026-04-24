import type { GenerateRequestBody } from "@/types";
import type Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are a JavaScript library code generator. Your ONLY job is to output the complete, working source code of a JavaScript library as a single ES module file.

RULES:
1. Output ONLY valid JavaScript. No markdown, no code fences, no explanation, no preamble.
2. Write the library as an ES module. Use \`import\` for dependencies and \`export\` for the public API.
3. Use npm packages via bare specifier imports when they are the right tool (e.g. D3 for data viz, Three.js for 3D, GSAP for animation): \`import * as d3 from 'd3'\`. The runtime resolves them automatically. For simple tasks, use browser-native APIs.
4. Always export the library's public API as named exports (e.g. \`export class BarChart\`, \`export function createChart\`).
5. The #container element is always available in the DOM: document.getElementById('container').
6. The library must make ALL provided examples work correctly and simultaneously.
7. Do NOT add features, classes, or functionality not demonstrated in the provided examples. Implement the minimum code needed to make the examples work — nothing more.
8. When fixing errors, address them precisely without breaking passing examples.
9. Keep the library as a single file — no multi-file splits.`;

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
