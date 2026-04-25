# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spec Forge is a web-based IDE where users write JavaScript usage examples and Claude generates a complete library implementation from them. The core loop: write examples → generate → preview in sandbox iframe → refine.

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Start production server
```

No test or lint scripts are configured. Requires `ANTHROPIC_API_KEY` in `.env.local`.

## Architecture

### Data Flow

1. User writes example code in the Monaco editor
2. `useWorkbenchStore.generate()` POSTs to `/api/generate` with all examples, current library code, failed examples, and optional refinement instruction
3. API streams Claude's response (raw JS, no fences); `extractCodeFromBuffer()` strips any accidental fences
4. Generated library code is stored in Zustand, which triggers sandbox iframes to re-run
5. Each iframe runs the library + one example via `postMessage`, reports pass/fail/console output back

### Key Files

| Path | Role |
|---|---|
| `src/store/useWorkbenchStore.ts` | Single Zustand store (immer + persist). Source of truth for examples, library state, generation status. `generate()` is the main orchestration method. |
| `src/app/api/generate/route.ts` | Next.js Route Handler. Validates request with Zod, streams Claude `claude-sonnet-4-6` response at 8192 tokens. |
| `src/lib/prompts.ts` | `SYSTEM_PROMPT` (strict rules for Claude) and `buildGenerationMessages()` which assembles the user message with prompt caching on the stable examples block. |
| `src/lib/sandbox.ts` | `extractCodeFromBuffer()` — strips markdown fences from Claude's streamed output. |
| `src/types/index.ts` | All shared types, including the `postMessage` protocol (`RunCodeMessage`, `RunResultMessage`, `ConsoleMessage`). |
| `src/components/Workbench.tsx` | Root layout: 3-column (examples sidebar / editor / preview), with draggable dividers. |
| `src/components/preview/` | Preview iframe(s) and console panel. Each example gets its own always-mounted iframe (visibility toggled). |

### State Persistence

Zustand persists to localStorage under key `"spec-forge-state"`. `isGenerating` and `streamBuffer` are excluded from persistence via `partialize`.

### Sandbox iframe Protocol

Parent → iframe: `RunCodeMessage { type: "RUN_CODE", exampleId, libraryCode, exampleCode }`

Iframe → parent: `RunResultMessage { type: "RUN_RESULT", exampleId, status, error }` and `ConsoleMessage { type: "CONSOLE", exampleId, level, args }`

### Prompt Caching

`buildGenerationMessages()` marks the examples block with `cache_control: { type: "ephemeral" }` so repeated generations with the same examples (e.g. refinements and error fixes) hit the Anthropic prompt cache.

### Error Signaling

The streaming API embeds errors as `__ERROR__:<message>` in the stream body (rather than HTTP error status) so the client can detect failures mid-stream.

## Key Constraints from SYSTEM_PROMPT

These rules govern what Claude generates — keep them consistent if modifying prompts:

- Output is a single ES module file, no markdown
- Must use established npm packages (D3 for charts, Three.js for 3D, GSAP for animation, mathjs for math)
- Named imports only — never `import * as` (tree-shaking requirement)
- Export style must match how examples import (`import X from` → default export; `import { x }` → named exports)
- `#container` element is always available via `document.getElementById('container')`
- Internal layout values (width, height, margins) must be `const` inside the implementation, never exposed as public options unless an example explicitly passes them
- Delete all code not used by current examples — if an example is removed, its related library code must go too
