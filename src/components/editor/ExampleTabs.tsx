
import type { Example } from "@/types";

const STATUS_DOT: Record<Example["status"], string> = {
  idle: "bg-zinc-600",
  running: "bg-yellow-400 animate-pulse",
  pass: "bg-green-400",
  fail: "bg-red-400",
};

interface Props {
  examples: Example[];
  activeId: string | "library" | null;
  onTabChange: (id: string | "library") => void;
}

export default function ExampleTabs({ examples, activeId, onTabChange }: Props) {
  return (
    <div className="flex items-center border-b border-zinc-200 bg-white overflow-x-auto">
      {examples.map((ex) => (
        <button
          key={ex.id}
          onClick={() => onTabChange(ex.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
            activeId === ex.id
              ? "border-indigo-500 text-zinc-900"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ex.status]}`} />
          {ex.name}
        </button>
      ))}
      <button
        onClick={() => onTabChange("library")}
        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
          activeId === "library"
            ? "border-indigo-500 text-zinc-900"
            : "border-transparent text-zinc-600 hover:text-zinc-900"
        }`}
      >
        Library
      </button>
    </div>
  );
}
