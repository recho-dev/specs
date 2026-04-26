"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Version, VersionedExample } from "@/types";

const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false }
);

interface Props {
  version: Version;
  currentCode: string;
  currentExamples: VersionedExample[];
  onClose: () => void;
}

type Tab = "library" | string; // string = example id

const DIFF_OPTIONS = {
  readOnly: true,
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  padding: { top: 12 },
  renderLineHighlight: "none" as const,
  overviewRulerLanes: 0,
  contextmenu: false,
  folding: false,
};

export default function VersionDiffModal({ version, currentCode, currentExamples, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  // Build unified example list: all example ids from either side
  const versionExMap = new Map(version.examples.map((e) => [e.id, e]));
  const currentExMap = new Map(currentExamples.map((e) => [e.id, e]));
  const allIds = Array.from(new Set([...versionExMap.keys(), ...currentExMap.keys()]));

  // Label for each example tab: prefer current name, fallback to version name
  const exampleLabel = (id: string) =>
    (currentExMap.get(id) ?? versionExMap.get(id))!.name;

  // Diff values for the active tab
  let original = "";
  let modified = "";

  if (activeTab === "library") {
    original = version.libraryCode;
    modified = currentCode;
  } else {
    original = versionExMap.get(activeTab)?.code ?? "";
    modified = currentExMap.get(activeTab)?.code ?? "";
  }

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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
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
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-zinc-800 px-4 flex-shrink-0 overflow-x-auto">
          {[{ id: "library", label: "Library" }, ...allIds.map((id) => ({ id, label: exampleLabel(id) }))].map(
            ({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`text-xs px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "border-indigo-500 text-zinc-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Diff editor */}
        <div className="flex-1 min-h-0">
          <MonacoDiffEditor
            key={activeTab}
            height="100%"
            language="javascript"
            original={original}
            modified={modified}
            theme="vs-dark"
            options={DIFF_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
