"use client";

import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import ExampleTabs from "./ExampleTabs";
import CodeEditor from "./CodeEditor";
import RefinementBar from "./RefinementBar";

export default function EditorPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const viewingPackageJson = useWorkbenchStore((s) => s.viewingPackageJson);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const packageJson = useWorkbenchStore((s) => s.library.packageJson);
  const streamBuffer = useWorkbenchStore((s) => s.library.streamBuffer);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const generationError = useWorkbenchStore((s) => s.library.generationError);
  const setExampleCode = useWorkbenchStore((s) => s.setExampleCode);
  const setPackageJson = useWorkbenchStore((s) => s.setPackageJson);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const setViewingLibrary = useWorkbenchStore((s) => s.setViewingLibrary);
  const setViewingPackageJson = useWorkbenchStore((s) => s.setViewingPackageJson);
  const generate = useWorkbenchStore((s) => s.generate);

  const activeExample = examples.find((e) => e.id === activeExampleId) ?? null;

  function handleTabChange(id: string | "library" | "package.json") {
    if (id === "library") {
      setViewingLibrary(true);
    } else if (id === "package.json") {
      setViewingPackageJson(true);
    } else {
      setActiveExample(id);
    }
  }

  const tabActiveId = viewingLibrary ? "library" : viewingPackageJson ? "package.json" : activeExampleId;

  // What to show in the editor
  const editorValue = viewingLibrary
    ? (isGenerating ? streamBuffer : libraryCode)
    : viewingPackageJson
    ? packageJson
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
            key={viewingLibrary ? "library" : viewingPackageJson ? "package.json" : activeExampleId ?? "empty"}
            value={editorValue}
            onChange={
              viewingPackageJson
                ? (v) => setPackageJson(v)
                : !viewingLibrary && activeExampleId
                ? (v) => setExampleCode(activeExampleId, v)
                : undefined
            }
            readOnly={viewingLibrary}
            language={viewingPackageJson ? "json" : "javascript"}
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
        onGenerate={generate}
      />
    </div>
  );
}
