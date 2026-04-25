"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { SandboxInboundMessage } from "@/types";
import PreviewFrame from "./PreviewFrame";
import ConsoleLog from "./ConsoleLog";

const MIN_CONSOLE = 64;
const MAX_CONSOLE = 500;
const DEFAULT_CONSOLE = 128;
const LS_KEY = "spec-forge-console-height";

export default function PreviewPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const setExampleStatus = useWorkbenchStore((s) => s.setExampleStatus);
  const appendConsoleLine = useWorkbenchStore((s) => s.appendConsoleLine);
  const setSnapshot = useWorkbenchStore((s) => s.setSnapshot);
  const deleteSnapshot = useWorkbenchStore((s) => s.deleteSnapshot);

  const [consoleHeight, setConsoleHeight] = useState(DEFAULT_CONSOLE);
  const [showConsole, setShowConsole] = useState(false);
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
        setExampleStatus(msg.exampleId, msg.status, msg.error, msg.renderedHtml);
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
  const hasMismatch = displayedExample?.snapshotMismatch ?? false;
  const canSnapshot = displayedExample && displayedExample.status !== "running" && displayedExample.actualHtml !== undefined;

  useEffect(() => {
    setShowConsole(false);
  }, [activeExampleId, hasMismatch]);

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

  const statusLabel = () => {
    if (!displayedExample) return null;
    if (displayedExample.snapshotMismatch) {
      return <span className="text-xs text-amber-400">⚠ Snapshot</span>;
    }
    return (
      <span className={`text-xs ${
        displayedExample.status === "pass" ? "text-green-400" :
        displayedExample.status === "fail" ? "text-red-400" :
        displayedExample.status === "running" ? "text-yellow-400" :
        "text-zinc-600"
      }`}>
        {displayedExample.status === "running" ? "Running..." :
         displayedExample.status === "pass" ? "✓ Pass" :
         displayedExample.status === "fail" ? "✗ Fail" : "Idle"}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400">Preview</span>
        <div className="flex items-center gap-2">
          {displayedExample && !displayedExample.snapshot && (
            <button
              disabled={!canSnapshot}
              onClick={() => setSnapshot(displayedExample.id)}
              className="text-xs px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Take Snapshot
            </button>
          )}
          {displayedExample && displayedExample.snapshot && (
            <>
              <button
                disabled={!canSnapshot}
                onClick={() => setSnapshot(displayedExample.id)}
                className="text-xs px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Update Snapshot
              </button>
              <button
                onClick={() => deleteSnapshot(displayedExample.id)}
                className="text-xs px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors"
              >
                Delete
              </button>
            </>
          )}
          {statusLabel()}
        </div>
      </div>

      {/* iframes — one per example, all in DOM, show/hide */}
      <div className="flex-1 min-h-0 relative bg-white">
        {examples.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm bg-zinc-950">
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
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm bg-zinc-950">
            Click Generate to build the library
          </div>
        )}
      </div>

      {/* Console drag handle */}
      <div
        onPointerDown={onConsoleDividerPointerDown}
        onPointerMove={onConsoleDividerPointerMove}
        onPointerUp={onConsoleDividerPointerUp}
        className="h-1 flex-shrink-0 bg-zinc-800 hover:bg-zinc-600 active:bg-zinc-500 cursor-row-resize transition-colors"
      />

      {/* Bottom panel: snapshot diff or console */}
      <div className="bg-zinc-950 overflow-hidden flex flex-col" style={{ height: consoleHeight }}>
        {hasMismatch && !showConsole ? (
          <>
            <div className="px-3 py-1 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
              <span className="text-xs text-amber-400 font-mono">⚠ Snapshot Mismatch</span>
              <button
                onClick={() => setShowConsole(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Show Console
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
              <div>
                <span className="text-green-500 text-[10px] uppercase tracking-wider">Expected</span>
                <pre className="mt-1 max-h-20 overflow-auto bg-zinc-900 rounded p-2 text-zinc-300 whitespace-pre-wrap break-all">
                  {displayedExample?.snapshot}
                </pre>
              </div>
              <div>
                <span className="text-red-400 text-[10px] uppercase tracking-wider">Actual</span>
                <pre className="mt-1 max-h-20 overflow-auto bg-zinc-900 rounded p-2 text-zinc-300 whitespace-pre-wrap break-all">
                  {displayedExample?.actualHtml}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-1 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-600 font-mono">console</span>
              {hasMismatch && (
                <button
                  onClick={() => setShowConsole(false)}
                  className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
                >
                  Show Diff
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {displayedExample ? (
                <ConsoleLog
                  lines={displayedExample.consoleOutput}
                  error={displayedExample.error}
                />
              ) : (
                <div className="text-xs text-zinc-700 px-3 py-2 font-mono">
                  Select an example to see output
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
