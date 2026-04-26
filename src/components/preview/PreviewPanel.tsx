
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { SandboxInboundMessage } from "@/types";
import PreviewFrame from "./PreviewFrame";
import ConsoleLog from "./ConsoleLog";

const MIN_CONSOLE = 64;
const MAX_CONSOLE = 500;
const DEFAULT_CONSOLE = 128;
const LS_KEY = "forma-console-height";

export default function PreviewPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const setExampleStatus = useWorkbenchStore((s) => s.setExampleStatus);
  const appendConsoleLine = useWorkbenchStore((s) => s.appendConsoleLine);

  const [consoleHeight, setConsoleHeight] = useState(DEFAULT_CONSOLE);
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleDragging = useRef(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(LS_KEY));
    if (saved) setConsoleHeight(saved);
  }, []);

  // Global message handler routes results to the right example
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const msg = event.data as SandboxInboundMessage;
      if (!msg?.type) return;

      if (msg.type === "RUN_RESULT") {
        setExampleStatus(msg.exampleId, msg.status, msg.error);
      } else if (msg.type === "CONSOLE") {
        appendConsoleLine(msg.exampleId, {
          level: msg.level,
          args: msg.args,
          timestamp: Date.now(),
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setExampleStatus, appendConsoleLine]);

  const displayedExample = viewingLibrary
    ? null
    : examples.find((e) => e.id === activeExampleId) ?? null;

  const visibleId = viewingLibrary ? null : activeExampleId;

  const onConsoleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    consoleDragging.current = true;
    document.body.style.userSelect = "none";
  }, []);

  const onConsoleDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!consoleDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const h = Math.min(MAX_CONSOLE, Math.max(MIN_CONSOLE, rect.bottom - e.clientY));
    setConsoleHeight(h);
    localStorage.setItem(LS_KEY, String(h));
  }, []);

  const onConsoleDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!consoleDragging.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    consoleDragging.current = false;
    document.body.style.userSelect = "";
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-200 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600">Preview</span>
        {displayedExample && (
          <span className={`text-xs ${
            displayedExample.status === "pass" ? "text-green-400" :
            displayedExample.status === "fail" ? "text-red-400" :
            displayedExample.status === "running" ? "text-yellow-400" :
            "text-zinc-500"
          }`}>
            {displayedExample.status === "running" ? "Running..." :
             displayedExample.status === "pass" ? "✓ Pass" :
             displayedExample.status === "fail" ? "✗ Fail" : "Idle"}
          </span>
        )}
      </div>

      {/* iframes — one per example, all in DOM, show/hide */}
      <div className="flex-1 min-h-0 relative bg-white">
        {examples.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm bg-zinc-50">
            Preview will appear here
          </div>
        )}
        {libraryCode && examples.map((ex) => (
          <PreviewFrame
            key={ex.id}
            exampleId={ex.id}
            exampleCode={ex.code}
            libraryCode={libraryCode}
            isVisible={visibleId === ex.id}
          />
        ))}
        {!libraryCode && examples.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm bg-zinc-50">
            Click Generate to build the library
          </div>
        )}
      </div>

      {/* Console drag handle */}
      <div
        onPointerDown={onConsoleDividerPointerDown}
        onPointerMove={onConsoleDividerPointerMove}
        onPointerUp={onConsoleDividerPointerUp}
        className="h-1 flex-shrink-0 bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 cursor-row-resize transition-colors"
      />

      {/* Console output */}
      <div className="bg-zinc-50 overflow-hidden flex flex-col" style={{ height: consoleHeight }}>
        <div className="px-3 py-1 border-b border-zinc-200 shrink-0">
          <span className="text-xs text-zinc-500 font-mono">console</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayedExample ? (
            <ConsoleLog
              lines={displayedExample.consoleOutput}
              error={displayedExample.error}
            />
          ) : (
            <div className="text-xs text-zinc-500 px-3 py-2 font-mono">
              Select an example to see output
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
