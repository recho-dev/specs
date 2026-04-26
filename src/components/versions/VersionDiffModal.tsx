"use client";

import dynamic from "next/dynamic";
import type { Version } from "@/types";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false }
);

interface Props {
  version: Version;
  currentCode: string;
  onClose: () => void;
}

export default function VersionDiffModal({ version, currentCode, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden"
        style={{ width: "80vw", height: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-indigo-400 font-mono">v{version.versionNumber}</span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-400">current</span>
            {version.refinementPrompt && (
              <span className="text-zinc-600 text-xs truncate max-w-xs" title={version.refinementPrompt}>
                {version.refinementPrompt}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <MonacoDiffEditor
            height="100%"
            language="javascript"
            original={version.libraryCode}
            modified={currentCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 12 },
              renderLineHighlight: "none",
              overviewRulerLanes: 0,
              contextmenu: false,
              folding: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
