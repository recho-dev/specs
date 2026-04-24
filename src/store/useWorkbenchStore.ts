"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Example, LibraryState, ConsoleLine, GenerateRequestBody } from "@/types";
import { extractCodeFromBuffer } from "@/lib/sandbox";

const DEFAULT_EXAMPLE_CODE = `// Write how you want to use the library here
// Example:
// const chart = new BarChart(document.querySelector('#container'));
// chart.setData([10, 30, 20, 50, 40]);
// chart.render();
`;

interface WorkbenchStore {
  examples: Example[];
  library: LibraryState;
  activeExampleId: string | null;
  viewingLibrary: boolean;

  // example actions
  addExample: () => void;
  removeExample: (id: string) => void;
  renameExample: (id: string, name: string) => void;
  setExampleCode: (id: string, code: string) => void;
  setExampleStatus: (id: string, status: Example["status"], error?: string | null) => void;
  appendConsoleLine: (id: string, line: ConsoleLine) => void;
  clearConsoleOutput: (id: string) => void;
  setActiveExample: (id: string) => void;
  setViewingLibrary: (viewing: boolean) => void;

  // library actions
  setLibraryCode: (code: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  appendStreamBuffer: (chunk: string) => void;
  clearStreamBuffer: () => void;
  setGenerationError: (error: string | null) => void;

  // orchestration
  generate: (refinement?: string) => Promise<void>;
}

export const useWorkbenchStore = create<WorkbenchStore>()(
  persist(
    immer((set, get) => ({
      examples: [],
      library: {
        code: "",
        isGenerating: false,
        generationError: null,
        streamBuffer: "",
      },
      activeExampleId: null,
      viewingLibrary: false,

      addExample: () => {
        const id = nanoid();
        set((state) => {
          state.examples.push({
            id,
            name: `Example ${state.examples.length + 1}`,
            code: DEFAULT_EXAMPLE_CODE,
            status: "idle",
            error: null,
            consoleOutput: [],
          });
          state.activeExampleId = id;
          state.viewingLibrary = false;
        });
      },

      removeExample: (id) => {
        set((state) => {
          const idx = state.examples.findIndex((e) => e.id === id);
          state.examples.splice(idx, 1);
          if (state.activeExampleId === id) {
            state.activeExampleId = state.examples[0]?.id ?? null;
          }
        });
      },

      renameExample: (id, name) => {
        set((state) => {
          const ex = state.examples.find((e) => e.id === id);
          if (ex) ex.name = name;
        });
      },

      setExampleCode: (id, code) => {
        set((state) => {
          const ex = state.examples.find((e) => e.id === id);
          if (ex) ex.code = code;
        });
      },

      setExampleStatus: (id, status, error = null) => {
        set((state) => {
          const ex = state.examples.find((e) => e.id === id);
          if (ex) {
            ex.status = status;
            ex.error = error ?? null;
          }
        });
      },

      appendConsoleLine: (id, line) => {
        set((state) => {
          const ex = state.examples.find((e) => e.id === id);
          if (ex) ex.consoleOutput.push(line);
        });
      },

      clearConsoleOutput: (id) => {
        set((state) => {
          const ex = state.examples.find((e) => e.id === id);
          if (ex) ex.consoleOutput = [];
        });
      },

      setActiveExample: (id) => {
        set((state) => {
          state.activeExampleId = id;
          state.viewingLibrary = false;
        });
      },

      setViewingLibrary: (viewing) => {
        set((state) => {
          state.viewingLibrary = viewing;
          if (viewing) state.activeExampleId = null;
        });
      },

      setLibraryCode: (code) => {
        set((state) => {
          state.library.code = code;
          state.library.streamBuffer = "";
        });
      },

      setGenerating: (isGenerating) => {
        set((state) => {
          state.library.isGenerating = isGenerating;
        });
      },

      appendStreamBuffer: (chunk) => {
        set((state) => {
          state.library.streamBuffer += chunk;
        });
      },

      clearStreamBuffer: () => {
        set((state) => {
          state.library.streamBuffer = "";
        });
      },

      setGenerationError: (error) => {
        set((state) => {
          state.library.generationError = error;
          state.library.isGenerating = false;
          state.library.streamBuffer = "";
        });
      },

      generate: async (refinement = "") => {
        const state = get();
        if (state.examples.length === 0) return;

        const failedExamples = state.examples
          .filter((e) => e.status === "fail" && e.error)
          .map((e) => ({ name: e.name, code: e.code, error: e.error! }));

        const body: GenerateRequestBody = {
          examples: state.examples.map((e) => ({ name: e.name, code: e.code })),
          currentLibraryCode: state.library.code,
          refinementInstruction: refinement,
          failedExamples,
        };

        set((s) => {
          s.library.isGenerating = true;
          s.library.generationError = null;
          s.library.streamBuffer = "";
          s.viewingLibrary = true;
          // mark all examples as running
          s.examples.forEach((e) => {
            e.status = "running";
            e.consoleOutput = [];
            e.error = null;
          });
        });

        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const err = await res.text();
            get().setGenerationError(`HTTP ${res.status}: ${err}`);
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            get().appendStreamBuffer(chunk);
          }

          if (buffer.includes("__ERROR__:")) {
            const errMsg = buffer.split("__ERROR__:")[1]?.trim() ?? "Generation failed";
            get().setGenerationError(errMsg);
            return;
          }

          const libraryCode = extractCodeFromBuffer(buffer);
          get().setLibraryCode(libraryCode);
          set((s) => {
            s.library.isGenerating = false;
          });

        } catch (err) {
          get().setGenerationError(err instanceof Error ? err.message : "Unknown error");
        }
      },
    })),
    {
      name: "spec-forge-state",
      partialize: (state) => ({
        examples: state.examples,
        library: { ...state.library, isGenerating: false, streamBuffer: "" },
        activeExampleId: state.activeExampleId,
        viewingLibrary: state.viewingLibrary,
      }),
    }
  )
);
