
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import ExampleItem from "./ExampleItem";
import VersionTimeline from "@/components/versions/VersionTimeline";

export default function ExampleList() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const addExample = useWorkbenchStore((s) => s.addExample);
  const removeExample = useWorkbenchStore((s) => s.removeExample);
  const renameExample = useWorkbenchStore((s) => s.renameExample);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const generate = useWorkbenchStore((s) => s.generate);

  return (
    <div className="flex flex-col h-full">
      {/* Traffic light drag region — 36px top clearance for macOS buttons */}
      <div
        className="h-9 flex-shrink-0 flex items-end px-3 pb-2 border-b border-zinc-200"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {examples.length === 0 && (
          <p className="text-xs text-zinc-500 px-2 py-3 text-center">
            No examples yet.
            <br />
            Add one to get started.
          </p>
        )}
        {examples.map((ex) => (
          <ExampleItem
            key={ex.id}
            example={ex}
            isActive={activeExampleId === ex.id}
            onSelect={() => setActiveExample(ex.id)}
            onRemove={() => removeExample(ex.id)}
            onRename={(name) => renameExample(ex.id, name)}
          />
        ))}
      </div>

      <VersionTimeline />

      <div className="p-2 border-t border-zinc-200 space-y-2">
        <button
          onClick={addExample}
          className="w-full text-xs text-zinc-700 hover:text-zinc-900 border border-zinc-300 hover:border-zinc-400 rounded-md py-1.5 transition-colors"
        >
          + Add Example
        </button>
        <button
          onClick={() => generate()}
          disabled={isGenerating || examples.length === 0}
          className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 text-white disabled:text-zinc-500 rounded-md py-1.5 transition-colors"
        >
          {isGenerating ? "Generating..." : "▶ Generate"}
        </button>
      </div>
    </div>
  );
}
