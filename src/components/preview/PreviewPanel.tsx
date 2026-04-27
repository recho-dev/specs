import { useEffect, useState } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { SandboxInboundMessage } from "@/types";
import PreviewFrame from "./PreviewFrame";
import ConsoleLog from "./ConsoleLog";

function TerminalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="10" height="8" rx="1.5" />
      <path d="M4 5.5l2 1.5-2 1.5" />
      <path d="M7.5 8.5h2" />
    </svg>
  );
}

function exampleDisplayTitle(name: string) {
  return /\.\w+$/.test(name) ? name : `${name}.js`;
}

export default function PreviewPanel() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const setExampleStatus = useWorkbenchStore((s) => s.setExampleStatus);
  const appendConsoleLine = useWorkbenchStore((s) => s.appendConsoleLine);

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleBtnHovered, setConsoleBtnHovered] = useState(false);

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
    : (examples.find((e) => e.id === activeExampleId) ?? null);

  const visibleId = viewingLibrary ? null : activeExampleId;

  const exStatus = displayedExample?.status ?? "idle";
  const statusKind: "idle" | "running" | "ready" | "error" = isGenerating
    ? "running"
    : exStatus === "pass"
    ? "ready"
    : exStatus === "fail"
    ? "error"
    : exStatus === "running"
    ? "running"
    : "idle";

  const statusDotColor: Record<typeof statusKind, string> = {
    idle: "#C0BAB0",
    running: "#F0A020",
    ready: "#28B84A",
    error: "#E0362A",
  };

  const statusLabel: Record<typeof statusKind, string> = {
    idle: "Idle",
    running: "Running…",
    ready: "Ready",
    error: "Error",
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#F5F4F2" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0 px-5"
        style={{ height: 40, background: "#ECEAE6", borderBottom: "1px solid #DDD9D2" }}
      >
        <span className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span
            className="text-[13px] font-semibold tracking-[0.06em] uppercase shrink-0"
            style={{ color: "#3A3834" }}
          >
            Preview
          </span>
          {displayedExample && (
            <span className="text-[13px] truncate" style={{ color: "#8A8780" }}>
              {exampleDisplayTitle(displayedExample.name)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status dot + label (hidden when idle) */}
          {statusKind !== "idle" && (
            <div className="flex items-center gap-1.5">
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusDotColor[statusKind],
                  animation: statusKind === "running" ? "status-pulse 1s ease-in-out infinite" : "none",
                  flexShrink: 0,
                }}
              />
              <span className="text-[12px]" style={{ color: "#8A8780" }}>
                {statusLabel[statusKind]}
              </span>
            </div>
          )}
          {/* Console toggle icon button */}
          <button
            onClick={() => setConsoleOpen((v) => !v)}
            onMouseEnter={() => setConsoleBtnHovered(true)}
            onMouseLeave={() => setConsoleBtnHovered(false)}
            title={consoleOpen ? "Show preview" : "Show console"}
            style={{
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: consoleOpen || consoleBtnHovered ? "#DDD9D2" : "none",
              color: consoleOpen || consoleBtnHovered ? "#3A3834" : "#8A8780",
              borderRadius: 4,
              cursor: "pointer",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            <TerminalIcon />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 relative">
        {/* Preview iframes — always mounted, toggled visible */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ display: consoleOpen ? "none" : "flex" }}
        >
          {examples.length === 0 && (
            <div className="text-sm px-5 pt-5" style={{ color: "#ACA89F" }}>
              Preview will appear here
            </div>
          )}
          {!libraryCode && examples.length > 0 && (
            <div className="text-sm px-5 pt-5" style={{ color: "#ACA89F" }}>
              Click Generate to build the library
            </div>
          )}
          {libraryCode &&
            examples.map((ex) => (
              <PreviewFrame
                key={ex.id}
                exampleId={ex.id}
                exampleCode={ex.code}
                libraryCode={libraryCode}
                isVisible={visibleId === ex.id}
              />
            ))}
        </div>

        {/* Console panel */}
        {consoleOpen && (
          <div className="absolute inset-0 overflow-y-auto" style={{ background: "#FAFAF9" }}>
            {displayedExample ? (
              <ConsoleLog lines={displayedExample.consoleOutput} error={displayedExample.error} />
            ) : (
              <div className="text-sm px-3 py-2 font-mono" style={{ color: "#ACA89F" }}>
                Select an example to see output
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
