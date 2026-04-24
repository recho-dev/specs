"use client";

import { useEffect } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { SandboxInboundMessage } from "@/types";
import PreviewFrame from "./PreviewFrame";
import ConsoleLog from "./ConsoleLog";

export default function PreviewPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const setExampleStatus = useWorkbenchStore((s) => s.setExampleStatus);
  const appendConsoleLine = useWorkbenchStore((s) => s.appendConsoleLine);
  const clearConsoleOutput = useWorkbenchStore((s) => s.clearConsoleOutput);

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

  // Which example to show console/status for
  const displayedExample = viewingLibrary
    ? null
    : examples.find((e) => e.id === activeExampleId) ?? null;

  const visibleId = viewingLibrary ? null : activeExampleId;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">Preview</span>
        {displayedExample && (
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
        )}
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

      {/* Console output */}
      <div className="h-32 border-t border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="px-3 py-1 border-b border-zinc-800/50">
          <span className="text-xs text-zinc-600 font-mono">console</span>
        </div>
        <div className="h-[calc(100%-24px)] overflow-y-auto">
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
      </div>
    </div>
  );
}
