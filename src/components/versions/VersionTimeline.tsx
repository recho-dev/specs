"use client";

import { useState } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { Version } from "@/types";
import VersionDiffModal from "./VersionDiffModal";

function formatAge(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function VersionTimeline() {
  const versions = useWorkbenchStore((s) => s.versions);
  const activeVersionId = useWorkbenchStore((s) => s.activeVersionId);
  const restoreVersion = useWorkbenchStore((s) => s.restoreVersion);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const currentCode = useWorkbenchStore((s) => s.library.code);
  const currentExamples = useWorkbenchStore((s) => s.examples);
  const [open, setOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<Version | null>(null);

  if (versions.length === 0) return null;

  const sorted = [...versions].reverse();

  return (
    <>
      <div className="border-t border-zinc-800">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span className="flex items-center gap-1">
            <span className={`transition-transform inline-block ${open ? "rotate-90" : ""}`}>▸</span>
            History
          </span>
          <span className="text-zinc-600">{versions.length}</span>
        </button>

        {open && (
          <div className="max-h-[160px] overflow-y-auto pb-1">
            {sorted.map((v) => {
              const isCurrent = v.id === activeVersionId;
              return (
                <div
                  key={v.id}
                  className={`group flex items-center justify-between px-3 py-1.5 ${
                    isCurrent ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-xs font-mono ${isCurrent ? "text-indigo-400" : "text-zinc-400"}`}>
                      v{v.versionNumber}
                    </span>
                    <span
                      className="text-[10px] text-zinc-600 truncate"
                      title={v.refinementPrompt || "Initial generation"}
                    >
                      {v.refinementPrompt || "Initial"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-zinc-700">{formatAge(v.timestamp)}</span>
                    <button
                      onClick={() => setDiffVersion(v)}
                      title={`Diff v${v.versionNumber} vs current`}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 text-xs px-1 transition-opacity"
                    >
                      ±
                    </button>
                    <button
                      onClick={() => restoreVersion(v.id)}
                      disabled={isCurrent || isGenerating}
                      title={`Restore v${v.versionNumber}`}
                      className="opacity-0 group-hover:opacity-100 disabled:opacity-0 text-zinc-500 hover:text-indigo-400 text-xs px-1 transition-opacity"
                    >
                      ↺
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {diffVersion && (
        <VersionDiffModal
          version={diffVersion}
          currentCode={currentCode}
          currentExamples={currentExamples}
          onClose={() => setDiffVersion(null)}
        />
      )}
    </>
  );
}
