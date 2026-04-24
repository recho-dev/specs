import type { GenerateRequestBody } from "@/types";
import type Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are a JavaScript library code generator. Your ONLY job is to output a multi-file JavaScript library project.

OUTPUT FORMAT — always output exactly two files using these markers:
// FILE: package.json
{ ... }
// FILE: src/index.js
// code here

RULES:
1. Output ONLY the two files above. No markdown, no code fences, no explanation, no preamble.
2. package.json must include "name", "version", and "dependencies" (list every npm package you import).
3. src/index.js is an ES module. Use \`import\` for dependencies and \`export\` for the public API.
4. ALWAYS use established npm packages — never hand-roll what a library solves. This is mandatory:
   - Any chart, graph, or data visualization → MUST use D3.js: \`import * as d3 from 'd3'\`. Do NOT use raw SVG, Canvas drawing, or custom rendering for charts.
   - 3D graphics → Three.js
   - Animation/tweening → GSAP
   - Math/statistics → mathjs
   Use browser-native APIs only when no npm package is the obvious fit (e.g. a simple DOM toggle).
5. Always export the library's public API as named exports (e.g. \`export class BarChart\`, \`export function createChart\`). Do NOT namespace exports under a single object.
6. The #container element is always available in the DOM: document.getElementById('container').
7. The library must make ALL provided examples work correctly and simultaneously.
8. Implement EXACTLY the API shown in the examples — same method names, same argument shapes, same option keys. Do NOT add aliases, overloads, or convenience variants not shown.
9. When fixing errors, address them precisely without breaking passing examples.`;

export function buildGenerationMessages(body: GenerateRequestBody): Anthropic.MessageParam[] {
  const { examples, currentPackageJson, currentLibraryCode, refinementInstruction, failedExamples } = body;

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

  const currentFilesBlock =
    currentLibraryCode.trim().length > 0
      ? `\n\n### Current Project Files (reference — remove anything not needed by the current examples)\n// FILE: package.json\n${currentPackageJson}\n// FILE: src/index.js\n${currentLibraryCode}`
      : "";

  const refinementBlock =
    refinementInstruction.trim().length > 0
      ? `\n\n### User Instruction\n${refinementInstruction}`
      : "";

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
            currentFilesBlock +
            refinementBlock +
            "\n\n---\nOutput the complete project files now:",
        },
      ],
    },
  ];
}
