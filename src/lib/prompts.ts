import type { GenerateRequestBody, ChatRequestBody } from "@/types";
import type Anthropic from "@anthropic-ai/sdk";

// ── Library generation ────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a JavaScript library code generator. Your ONLY job is to output the complete, working source code of a JavaScript library as a single ES module file.

RULES:
1. Output ONLY valid JavaScript. No markdown, no code fences, no explanation, no preamble.
2. Write the library as an ES module. Use \`import\` for dependencies and \`export\` for the public API.
3. ALWAYS use established npm packages — never hand-roll what a library solves. This is mandatory, not optional:
   - Any chart, graph, or data visualization → MUST use D3.js. Do NOT use raw SVG, Canvas drawing, or custom rendering for charts.
   - 3D graphics → Three.js
   - Animation/tweening → GSAP
   - Math/statistics → mathjs
   Use browser-native APIs only when no npm package is the obvious fit (e.g. a simple DOM toggle).
   ALWAYS use named imports for external packages — import only what you use: \`import { scaleLinear, axisBottom } from 'd3'\`. NEVER use namespace imports like \`import * as d3 from 'd3'\` — they defeat tree-shaking.
4. Match your export style EXACTLY to how the examples import the library:
   - \`import * as X from 'pkg'\` → use named exports: \`export function foo() {}\`, \`export class Bar {}\`
   - \`import X from 'pkg'\` → use a single default export: \`export default { foo, Bar }\` or \`export default class Bar {}\`
   - \`import { foo, Bar } from 'pkg'\` → use named exports: \`export function foo() {}\`, \`export class Bar {}\`
   NEVER assign to \`window.*\` — that is handled automatically by the runtime.
5. The #container element is always available in the DOM: document.getElementById('container').
6. The library must make ALL provided examples work correctly and simultaneously.
7. Implement EXACTLY the API shown in the examples — the same method names, the same argument shapes, the same option keys. Do NOT add aliases, overloads, or convenience variants not shown. If the example uses \`type: 'barY'\`, do not also support \`type: 'bar'\`.
   DEAD CODE RULE: Treat the current examples as the sole source of truth. If a method, class, option key, or export does not appear anywhere in the current examples, it does not exist — delete it unconditionally, even if it exists in the current library code. Do not keep it "just in case". The previous library code is only a hint for implementation details; the examples define the entire public API.
8. Internal values not shown in examples (e.g. width, height, padding, margins, colors, font sizes) must be declared as plain \`const\` variables inside the implementation — NOT as options, parameters, or object keys exposed to the caller. Only promote a value to a public option when an example explicitly passes it.
9. Structure the code cleanly:
   - Each distinct public API entry point should be its own standalone function — do NOT collapse multiple into one function driven by a \`type\` parameter or a long if/else chain.
   - Logic shared by more than one function must be extracted into a private helper. Never copy the same block into multiple places.
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

// ── Chat agent ────────────────────────────────────────────────────────────────

export const CHAT_SYSTEM_PROMPT = `You are an AI assistant embedded in Recho Form, a tool for building JavaScript libraries by example. You help users manage their library source code and usage examples.

You ALWAYS respond with valid JSON in one of two shapes — no markdown, no code fences, nothing else:
  {"type":"answer","text":"..."}
  {"type":"actions","steps":[...],"note":"..."}

The "note" field on actions is optional — include it only when you made a non-obvious decision the user should know about (e.g. resolved a conflict between examples).

## Available actions

In both modes:
  {"tool":"update_library"} — regenerate the library to make all current examples work
  {"tool":"delete_example","id":"..."} — remove an example by id
  {"tool":"optimize_example","id":"...","code":"..."} — rewrite an example's code in full (fix syntax errors, resolve API conflicts, rename methods)

In chat mode only:
  {"tool":"add_example","name":"filename.js","code":"..."} — add a new example
  {"tool":"rename_example","id":"...","name":"filename.js"} — rename an example, but ONLY if its current name is "untitled.js"

## Mode: generate

The user clicked Generate. Goal: make existing examples work.

Steps to follow:
1. Inspect all examples for problems: syntax errors, API shape conflicts between examples (e.g. two examples call the same method with incompatible signatures or different names)
2. Fix any broken or conflicting examples using optimize_example
3. Always end with update_library so the library is regenerated

Rules:
- Do NOT add new examples in generate mode
- Resolve all conflicts with your best judgment — pick the most consistent option, or prefer the API used by the majority of examples. Never ask the user, never skip a conflict
- If you resolved a conflict, describe what you changed in the "note" field
- If there are no problems, just include update_library (the system will detect if anything actually changed)
- If an example is named "untitled.js", rename it to something descriptive based on its code using rename_example

## Mode: chat

The user sent a message. Decide:
- Question about their code, library, API design, or JavaScript → {"type":"answer","text":"..."}
- Request within scope → {"type":"actions","steps":[...]}
- Request outside scope → {"type":"answer","text":"I can't [what they asked], but I can [relevant things you can do]."}

Scope in chat mode: answer questions, update the library, add/delete/fix examples.
Out of scope: deploying, publishing, unrelated topics, changing the Recho Form app itself.

When acting: always end action plans with update_library unless the user explicitly only asked to change examples (no library update needed).

## Output rules
Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`;

export function buildChatMessages(body: ChatRequestBody): Anthropic.MessageParam[] {
  const { instruction, mode, examples, libraryCode, diff } = body;

  const examplesBlock = examples
    .map((ex, i) => {
      const errorLine = ex.error ? `\nStatus: FAILING — ${ex.error}` : "";
      return `### Example ${i + 1}: ${ex.name} (id: ${ex.id})${errorLine}\n\`\`\`javascript\n${ex.code}\n\`\`\``;
    })
    .join("\n\n");

  const libraryBlock = libraryCode.trim()
    ? `\n\n### Current Library Code\n\`\`\`javascript\n${libraryCode}\n\`\`\``
    : "\n\n### Current Library Code\n(not yet generated)";

  const diffParts: string[] = [];
  if (diff.added.length) diffParts.push(`Added: ${diff.added.map((e) => e.name).join(", ")}`);
  if (diff.removed.length) diffParts.push(`Removed: ${diff.removed.map((e) => e.name).join(", ")}`);
  if (diff.modified.length) diffParts.push(`Modified: ${diff.modified.map((e) => e.name).join(", ")}`);
  const diffBlock = diffParts.length
    ? `\n\n### Changes since last generation\n${diffParts.join("\n")}`
    : "\n\n### Changes since last generation\n(none — examples and library are in sync)";

  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `## Current Examples\n\n${examplesBlock}`,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text:
            libraryBlock +
            diffBlock +
            `\n\n## Mode: ${mode}` +
            `\n\n## Instruction\n${instruction}` +
            "\n\n---\nRespond with JSON only:",
        },
      ],
    },
  ];
}
