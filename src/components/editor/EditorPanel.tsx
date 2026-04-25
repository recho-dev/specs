"use client";

import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import ExampleTabs from "./ExampleTabs";
import CodeEditor from "./CodeEditor";
import RefinementBar from "./RefinementBar";

export default function EditorPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const streamBuffer = useWorkbenchStore((s) => s.library.streamBuffer);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const generationError = useWorkbenchStore((s) => s.library.generationError);
  const setExampleCode = useWorkbenchStore((s) => s.setExampleCode);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const setViewingLibrary = useWorkbenchStore((s) => s.setViewingLibrary);
  const refine = useWorkbenchStore((s) => s.refine);
  const answerSpecQuestion = useWorkbenchStore((s) => s.answerSpecQuestion);
  const specQuestion = useWorkbenchStore((s) => s.specQuestion);

  const activeExample = examples.find((e) => e.id === activeExampleId) ?? null;

  function handleTabChange(id: string | "library") {
    if (id === "library") {
      setViewingLibrary(true);
    } else {
      setActiveExample(id);
    }
  }

  const tabActiveId = viewingLibrary ? "library" : activeExampleId;

  // What to show in the editor
  const editorValue = viewingLibrary
    ? (isGenerating ? streamBuffer : libraryCode)
    : (activeExample?.code ?? "");

  return (
    <div className="flex flex-col h-full">
      <ExampleTabs
        examples={examples}
        activeId={tabActiveId}
        onTabChange={handleTabChange}
      />

      <div className="flex-1 min-h-0 relative">
        {examples.length === 0 && !viewingLibrary ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-sm gap-3">
            <div className="text-4xl">✦</div>
            <p className="text-center max-w-xs leading-relaxed">
              Add an example to describe how you want your library to work, then click{" "}
              <span className="text-indigo-400 font-medium">Generate</span>.
            </p>
          </div>
        ) : (
          <CodeEditor
            key={viewingLibrary ? "library" : activeExampleId ?? "empty"}
            value={editorValue}
            onChange={
              !viewingLibrary && activeExampleId
                ? (v) => setExampleCode(activeExampleId, v)
                : undefined
            }
            readOnly={viewingLibrary}
          />
        )}
      </div>

      {generationError && (
        <div className="px-3 py-2 bg-red-950 border-t border-red-800 text-xs text-red-300">
          Generation error: {generationError}
        </div>
      )}

      <RefinementBar
        isGenerating={isGenerating}
        hasExamples={examples.length > 0}
        specQuestion={specQuestion}
        onGenerate={refine}
        onAnswer={answerSpecQuestion}
      />
    </div>
  );
}
