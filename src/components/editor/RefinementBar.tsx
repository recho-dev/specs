
import { useState, useEffect, useRef } from "react";

interface Props {
  isGenerating: boolean;
  hasExamples: boolean;
  specQuestion: string | null;
  onGenerate: (instruction: string) => void;
  onAnswer: (answer: string) => void;
}

export default function RefinementBar({ isGenerating, hasExamples, specQuestion, onGenerate, onAnswer }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isAnswering = specQuestion !== null;

  function handleSubmit() {
    if (isGenerating) return;
    if (isAnswering) {
      if (!input.trim()) return;
      onAnswer(input);
    } else {
      if (!hasExamples) return;
      onGenerate(input);
    }
    setInput("");
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (isAnswering) inputRef.current?.focus();
  }, [isAnswering]);

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950">
      {specQuestion && (
        <div className="px-3 py-2 border-b border-indigo-900 bg-indigo-950/60 text-xs text-indigo-300 leading-relaxed">
          <span className="font-semibold text-indigo-400">Claude asks: </span>
          {specQuestion}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          placeholder={isAnswering ? "Your answer..." : 'Refine: "add animation", "use canvas", ...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          disabled={isGenerating || (!hasExamples && !isAnswering)}
          className="flex-shrink-0 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md px-3 py-1.5 transition-colors"
          title="Generate (⌘Enter)"
        >
          {isGenerating ? "..." : isAnswering ? "↩ Answer" : "▶ Generate"}
        </button>
      </div>
    </div>
  );
}
