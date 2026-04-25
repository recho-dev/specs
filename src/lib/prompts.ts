import type { GenerateRequestBody } from "@/types";
import type Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are a JavaScript library code generator. Your ONLY job is to output the complete, working source code of a JavaScript library as a single ES module file.

RULES:
1. Output ONLY valid JavaScript. No markdown, no code fences, no explanation, no preamble.
2. Write the library as an ES module. Use \`import\` for dependencies and \`export\` for the public API.
3. ALWAYS use established npm packages — never hand-roll what a library solves. This is mandatory, not optional:
   - Any chart, graph, or data visualization → MUST use D3.js: \`import * as d3 from 'd3'\`. Do NOT use raw SVG, Canvas drawing, or custom rendering for charts.
   - 3D graphics → Three.js
   - Animation/tweening → GSAP
   - Math/statistics → mathjs
   Use browser-native APIs only when no npm package is the obvious fit (e.g. a simple DOM toggle).
4. Match your export style EXACTLY to how the examples import the library:
   - \`import * as X from 'pkg'\` → use named exports: \`export function foo() {}\`, \`export class Bar {}\`
   - \`import X from 'pkg'\` → use a single default export: \`export default { foo, Bar }\` or \`export default class Bar {}\`
   - \`import { foo, Bar } from 'pkg'\` → use named exports: \`export function foo() {}\`, \`export class Bar {}\`
   NEVER assign to \`window.*\` — that is handled automatically by the runtime.
5. The #container element is always available in the DOM: document.getElementById('container').
6. The library must make ALL provided examples work correctly and simultaneously.
7. Implement EXACTLY the API shown in the examples — the same method names, the same argument shapes, the same option keys. Do NOT add aliases, overloads, or convenience variants not shown. If the example uses \`type: 'barY'\`, do not also support \`type: 'bar'\`.
   REMOVE any function, class, export, or feature not directly used by the current examples. If an example was deleted, delete all its related code too. The output must contain ONLY what the current examples need — nothing more.
8. Internal values not shown in examples (e.g. width, height, padding, margins, colors, font sizes) must be declared as plain \`const\` variables inside the implementation — NOT as options, parameters, or object keys exposed to the caller. Only promote a value to a public option when an example explicitly passes it.
9. Structure the code cleanly:
   - Give each distinct API function or chart type its own standalone function — do NOT merge multiple types into one function with a \`type\` switch or long if/else chain.
   - Extract any logic shared by more than one function (e.g. drawing axes, creating scales, building an SVG root) into a private helper. Never duplicate the same block across multiple functions.
10. When fixing errors, address them precisely without breaking passing examples.
11. Keep the library as a single file — no multi-file splits.`;

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
      ? `\n\n### Current Library Code (use as a starting point — DELETE any function, class, or export not directly used by the current examples above; the output must match the current examples exactly, no more)\n\`\`\`javascript\n${currentLibraryCode}\n\`\`\``
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
