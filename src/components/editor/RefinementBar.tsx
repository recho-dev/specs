
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
    <div className="flex flex-col border-t border-zinc-200 bg-white">
      {specQuestion && (
        <div className="px-3 py-2 border-b border-indigo-200 bg-indigo-50 text-xs text-indigo-800 leading-relaxed">
          <span className="font-semibold text-indigo-700">Claude asks: </span>
          {specQuestion}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          className="flex-1 bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-indigo-500 transition-colors"
          placeholder={isAnswering ? "Your answer..." : 'Refine: "add animation", "use canvas", ...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          disabled={isGenerating || (!hasExamples && !isAnswering)}
          className="flex-shrink-0 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 text-white disabled:text-zinc-500 rounded-md px-3 py-1.5 transition-colors"
          title="Generate (⌘Enter)"
        >
          {isGenerating ? "..." : isAnswering ? "↩ Answer" : "▶ Generate"}
        </button>
      </div>
    </div>
  );
}
