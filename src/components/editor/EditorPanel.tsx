"use client";

import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import ExampleTabs from "./ExampleTabs";
import SourceSidebar from "./SourceSidebar";
import CodeEditor from "./CodeEditor";
import RefinementBar from "./RefinementBar";

export default function EditorPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const editorMode = useWorkbenchStore((s) => s.editorMode);
  const activeSourceFile = useWorkbenchStore((s) => s.activeSourceFile);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const packageJson = useWorkbenchStore((s) => s.library.packageJson);
  const streamBuffer = useWorkbenchStore((s) => s.library.streamBuffer);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const generationError = useWorkbenchStore((s) => s.library.generationError);
  const setExampleCode = useWorkbenchStore((s) => s.setExampleCode);
  const setPackageJson = useWorkbenchStore((s) => s.setPackageJson);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const setEditorMode = useWorkbenchStore((s) => s.setEditorMode);
  const setActiveSourceFile = useWorkbenchStore((s) => s.setActiveSourceFile);
  const generate = useWorkbenchStore((s) => s.generate);

  const activeExample = examples.find((e) => e.id === activeExampleId) ?? null;

  const sourceEditorValue =
    activeSourceFile === "src/index.js"
      ? (isGenerating ? streamBuffer : libraryCode)
      : packageJson;

  const editorValue = editorMode === "source" ? sourceEditorValue : (activeExample?.code ?? "");
  const isEmpty = editorMode === "example" && examples.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: mode toggle + tabs */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        {/* Segmented toggle */}
        <div className="flex items-center gap-0.5 mx-2 my-1.5 p-0.5 bg-zinc-900 rounded-md flex-shrink-0">
          <button
            onClick={() => setEditorMode("example")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              editorMode === "example"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Example
          </button>
          <button
            onClick={() => setEditorMode("source")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              editorMode === "source"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Source
          </button>
        </div>

        {/* Example tabs — only in example mode */}
        {editorMode === "example" && (
          <ExampleTabs
            examples={examples}
            activeId={activeExampleId}
            onTabChange={setActiveExample}
          />
        )}

        {/* Source breadcrumb — only in source mode */}
        {editorMode === "source" && (
          <span className="text-xs text-zinc-500 px-2 truncate">
            {activeSourceFile}
          </span>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 flex">
        {/* File sidebar — source mode only */}
        {editorMode === "source" && (
          <SourceSidebar
            activeFile={activeSourceFile}
            onFileSelect={setActiveSourceFile}
          />
        )}

        {/* Monaco editor or empty state */}
        <div className="flex-1 min-w-0 relative">
          {isEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-sm gap-3">
              <div className="text-4xl">✦</div>
              <p className="text-center max-w-xs leading-relaxed">
                Add an example to describe how you want your library to work, then click{" "}
                <span className="text-indigo-400 font-medium">Generate</span>.
              </p>
            </div>
          ) : (
            <CodeEditor
              key={editorMode === "source" ? activeSourceFile : activeExampleId ?? "empty"}
              value={editorValue}
              onChange={
                editorMode === "source"
                  ? activeSourceFile === "package.json"
                    ? (v) => setPackageJson(v)
                    : undefined
                  : activeExampleId
                  ? (v) => setExampleCode(activeExampleId, v)
                  : undefined
              }
              readOnly={editorMode === "source" && activeSourceFile === "src/index.js"}
              language={activeSourceFile === "package.json" ? "json" : "javascript"}
            />
          )}
        </div>
      </div>

      {generationError && (
        <div className="px-3 py-2 bg-red-950 border-t border-red-800 text-xs text-red-300 flex-shrink-0">
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
