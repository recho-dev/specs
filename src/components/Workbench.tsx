"use client";

import ExampleList from "./examples/ExampleList";
import EditorPanel from "./editor/EditorPanel";
import PreviewPanel from "./preview/PreviewPanel";

export default function Workbench() {
  return (
    <div className="h-screen flex overflow-hidden bg-zinc-950 text-zinc-100">
      <aside className="w-52 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <ExampleList />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">
        <EditorPanel />
      </main>

      <aside className="w-[420px] flex-shrink-0 flex flex-col">
        <PreviewPanel />
      </aside>
    </div>
  );
}
