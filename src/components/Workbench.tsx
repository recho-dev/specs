
import { useCallback, useEffect, useRef, useState } from "react";
import ExampleList from "./examples/ExampleList";
import EditorPanel from "./editor/EditorPanel";
import PreviewPanel from "./preview/PreviewPanel";

const MIN_PREVIEW = 280;
const MAX_PREVIEW = 900;
const DEFAULT_PREVIEW = 420;
const LS_KEY = "forma-preview-width";

export default function Workbench() {
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(LS_KEY));
    if (saved) setPreviewWidth(saved);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    document.body.style.userSelect = "none";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = Math.min(MAX_PREVIEW, Math.max(MIN_PREVIEW, rect.right - e.clientX));
    setPreviewWidth(w);
    localStorage.setItem(LS_KEY, String(w));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = false;
    document.body.style.userSelect = "";
  }, []);

  return (
    <div ref={containerRef} className="h-full flex overflow-hidden bg-white text-zinc-900">
      <aside className="w-52 flex-shrink-0 border-r border-zinc-200 flex flex-col">
        <ExampleList />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <EditorPanel />
      </main>

      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-1 flex-shrink-0 bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 cursor-col-resize transition-colors"
      />

      <aside className="flex-shrink-0 flex flex-col" style={{ width: previewWidth }}>
        <PreviewPanel />
      </aside>
    </div>
  );
}
