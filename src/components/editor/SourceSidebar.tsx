"use client";

interface Props {
  activeFile: "package.json" | "src/index.js";
  onFileSelect: (file: "package.json" | "src/index.js") => void;
}

const files: { file: "package.json" | "src/index.js"; label: string; indent?: boolean }[] = [
  { file: "package.json", label: "package.json" },
  { file: "src/index.js", label: "index.js", indent: true },
];

export default function SourceSidebar({ activeFile, onFileSelect }: Props) {
  return (
    <div className="w-44 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* src/ folder row */}
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-500 select-none">
          <span className="text-[10px]">▾</span>
          <span>src</span>
        </div>
        {files.map(({ file, label, indent }) => (
          <button
            key={file}
            onClick={() => onFileSelect(file)}
            className={`w-full flex items-center gap-1.5 py-1 text-xs text-left transition-colors ${
              indent ? "pl-7 pr-3" : "px-3"
            } ${
              activeFile === file
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" fill="none" viewBox="0 0 16 16">
              <path d="M4 2h6l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
