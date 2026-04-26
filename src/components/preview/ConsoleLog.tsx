
import { useEffect, useRef } from "react";
import type { ConsoleLine } from "@/types";

const LEVEL_CLASSES: Record<ConsoleLine["level"], string> = {
  log: "text-zinc-800",
  info: "text-blue-700",
  warn: "text-amber-700",
  error: "text-red-700",
};

interface Props {
  lines: ConsoleLine[];
  error: string | null;
}

export default function ConsoleLog({ lines, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  if (lines.length === 0 && !error) {
    return (
      <div className="text-xs text-zinc-500 px-3 py-2 font-mono">
        No output
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-full font-mono text-xs px-3 py-2 space-y-0.5">
      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
          ✗ {error}
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`${LEVEL_CLASSES[line.level]} flex gap-2`}>
          <span className="text-zinc-400 flex-shrink-0">
            {line.level === "warn" ? "⚠" : line.level === "error" ? "✗" : "›"}
          </span>
          <span className="break-all whitespace-pre-wrap">
            {line.args.map((a) => {
              try { return JSON.parse(a); } catch { return a; }
            }).join(" ")}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
