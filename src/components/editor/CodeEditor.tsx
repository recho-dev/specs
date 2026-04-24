"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-900 text-zinc-600 text-sm">
      Loading editor...
    </div>
  ),
});

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: string;
}

export default function CodeEditor({ value, onChange, readOnly = false, language = "javascript" }: Props) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      theme="vs-dark"
      options={{
        readOnly,
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "none",
        overviewRulerLanes: 0,
        contextmenu: false,
        folding: false,
      }}
    />
  );
}
