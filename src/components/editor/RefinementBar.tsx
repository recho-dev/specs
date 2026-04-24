"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isGenerating: boolean;
  hasExamples: boolean;
  onGenerate: (instruction: string) => void;
}

export default function RefinementBar({ isGenerating, hasExamples, onGenerate }: Props) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleGenerate() {
    if (!hasExamples || isGenerating) return;
    onGenerate(instruction);
    setInstruction("");
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleGenerate();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 bg-zinc-950">
      <input
        ref={inputRef}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500 transition-colors"
        placeholder='Refine: "add animation", "use canvas", ...'
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
        disabled={isGenerating || !hasExamples}
      />
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !hasExamples}
        className="flex-shrink-0 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-md px-3 py-1.5 transition-colors"
        title="Generate (⌘Enter)"
      >
        {isGenerating ? "..." : "▶ Generate"}
      </button>
    </div>
  );
}
