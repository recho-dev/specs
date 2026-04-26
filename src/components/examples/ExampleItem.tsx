
import { useState, useRef, useEffect } from "react";
import type { Example } from "@/types";

interface Props {
  example: Example;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
}

const STATUS_COLORS: Record<Example["status"], string> = {
  idle: "bg-zinc-600",
  running: "bg-yellow-400 animate-pulse",
  pass: "bg-green-400",
  fail: "bg-red-400",
};

export default function ExampleItem({ example, isActive, onSelect, onRemove, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(example.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    else setDraft(example.name);
    setEditing(false);
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md text-sm ${
        isActive ? "bg-zinc-200 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
      onClick={onSelect}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[example.status]}`} />

      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-white border border-zinc-300 rounded px-1 py-0.5 text-zinc-900 text-xs outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setDraft(example.name); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          title={example.name}
        >
          {example.name}
        </span>
      )}

      <button
        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity text-xs px-1"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove example"
      >
        ×
      </button>
    </div>
  );
}
