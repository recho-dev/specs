"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Example, LibraryState, ConsoleLine, GenerateRequestBody, SpecRequestBody, SpecResponse, SpecConversationTurn, Version, ExampleStatus } from "@/types";
import { extractCodeFromBuffer } from "@/lib/sandbox";

const MAX_VERSIONS = 30;

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

  // spec agent state
  specQuestion: string | null;
  specConversationHistory: SpecConversationTurn[];
  pendingRefinementInstruction: string;

  // version history
  versions: Version[];
  activeVersionId: string | null;
  saveVersion: (refinementPrompt: string) => void;
  restoreVersion: (id: string) => void;
  _updateVersionDescription: (id: string, description: string) => void;

  // orchestration
  generate: (refinement?: string) => Promise<void>;
  refine: (instruction: string) => Promise<void>;
  answerSpecQuestion: (answer: string) => Promise<void>;
  _handleSpecResponse: (data: SpecResponse) => Promise<void>;
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
      specQuestion: null,
      specConversationHistory: [],
      pendingRefinementInstruction: "",
      versions: [],
      activeVersionId: null,

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

      saveVersion: (refinementPrompt) => {
        const state = get();
        const previousVersion = state.versions[state.versions.length - 1] ?? null;

        let newVersionId: string;
        set((s) => {
          const newVersion: Version = {
            id: nanoid(),
            versionNumber: s.versions.length + 1,
            timestamp: Date.now(),
            libraryCode: s.library.code,
            examples: s.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
            refinementPrompt,
            description: "",
          };
          s.versions.push(newVersion);
          if (s.versions.length > MAX_VERSIONS) {
            s.versions.splice(0, s.versions.length - MAX_VERSIONS);
          }
          s.activeVersionId = newVersion.id;
          newVersionId = newVersion.id;
        });

        // Generate description asynchronously
        const currentState = get();
        const currentVersion = currentState.versions.find((v) => v.id === newVersionId!)!;
        fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refinementPrompt,
            previousLibraryCode: previousVersion?.libraryCode ?? "",
            currentLibraryCode: currentVersion.libraryCode,
            previousExamples: previousVersion?.examples ?? [],
            currentExamples: currentVersion.examples,
          }),
        })
          .then((res) => res.json())
          .then(({ description }) => {
            if (description) get()._updateVersionDescription(newVersionId!, description);
          })
          .catch(() => {});
      },

      _updateVersionDescription: (id, description) => {
        set((s) => {
          const v = s.versions.find((v) => v.id === id);
          if (v) v.description = description;
        });
      },

      restoreVersion: (id) => {
        set((s) => {
          const v = s.versions.find((v) => v.id === id);
          if (!v) return;
          s.examples = v.examples.map((e) => ({
            ...e,
            status: "idle" as ExampleStatus,
            error: null,
            consoleOutput: [],
          }));
          s.library.code = v.libraryCode;
          s.library.generationError = null;
          s.library.streamBuffer = "";
          s.viewingLibrary = true;
          s.activeExampleId = null;
          s.specQuestion = null;
          s.specConversationHistory = [];
          s.pendingRefinementInstruction = "";
          s.activeVersionId = id;
        });
      },

      refine: async (instruction) => {
        const state = get();
        if (state.examples.length === 0) return;

        set((s) => {
          s.library.isGenerating = true;
          s.library.generationError = null;
          s.specConversationHistory = [];
          s.pendingRefinementInstruction = instruction;
          s.specQuestion = null;
        });

        try {
          const body: SpecRequestBody = {
            examples: state.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
            refinementInstruction: instruction,
            conversationHistory: [],
          };
          const res = await fetch("/api/spec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            get().setGenerationError(`Spec agent failed: ${await res.text()}`);
            return;
          }
          await get()._handleSpecResponse(await res.json());
        } catch (err) {
          get().setGenerationError(err instanceof Error ? err.message : "Spec agent failed");
        }
      },

      answerSpecQuestion: async (answer) => {
        const state = get();
        const history: SpecConversationTurn[] = [
          ...state.specConversationHistory,
          { question: state.specQuestion!, answer },
        ];

        set((s) => {
          s.specConversationHistory = history;
          s.specQuestion = null;
          s.library.isGenerating = true;
          s.library.generationError = null;
        });

        try {
          const body: SpecRequestBody = {
            examples: state.examples.map((e) => ({ id: e.id, name: e.name, code: e.code })),
            refinementInstruction: state.pendingRefinementInstruction,
            conversationHistory: history,
          };
          const res = await fetch("/api/spec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            get().setGenerationError(`Spec agent failed: ${await res.text()}`);
            return;
          }
          await get()._handleSpecResponse(await res.json());
        } catch (err) {
          get().setGenerationError(err instanceof Error ? err.message : "Spec agent failed");
        }
      },

      _handleSpecResponse: async (data) => {
        if (data.type === "question") {
          set((s) => {
            s.specQuestion = data.question;
            s.library.isGenerating = false;
          });
          return;
        }

        const pendingInstruction = get().pendingRefinementInstruction;

        if (data.type === "update") {
          set((s) => {
            for (const updated of data.examples) {
              const ex = s.examples.find((e) => e.id === updated.id);
              if (ex) {
                ex.name = updated.name;
                ex.code = updated.code;
              }
            }
            s.specQuestion = null;
            s.specConversationHistory = [];
            s.pendingRefinementInstruction = "";
          });
        } else {
          // passthrough: clear spec state, examples unchanged
          set((s) => {
            s.specQuestion = null;
            s.specConversationHistory = [];
            s.pendingRefinementInstruction = "";
          });
        }

        await get().generate(pendingInstruction);
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
          get().saveVersion(refinement);
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
        versions: state.versions,
        activeVersionId: state.activeVersionId,
      }),
    }
  )
);
