import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle } from "react-resizable-panels";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import { readPanelLayout, savePanelLayout } from "@/lib/panelLayout";
import type { SandboxInboundMessage } from "@/types";
import PreviewFrame from "./PreviewFrame";
import ConsoleLog from "./ConsoleLog";

function TerminalIcon() { return <Terminal size={16} />; }

function exampleDisplayTitle(name: string) {
  return /\.\w+$/.test(name) ? name : `${name}.js`;
}

export default function PreviewPanel() {
  const projectPath = useWorkbenchStore((s) => s.projectPath);
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const viewingLibrary = useWorkbenchStore((s) => s.viewingLibrary);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const generationId = useWorkbenchStore((s) => s.generationId);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);
  const setExampleStatus = useWorkbenchStore((s) => s.setExampleStatus);
  const appendConsoleLine = useWorkbenchStore((s) => s.appendConsoleLine);

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleBtnHovered, setConsoleBtnHovered] = useState(false);
  const consolePanelRef = useRef<PanelImperativeHandle | null>(null);
  const consoleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Restore saved console state when a project is opened
  useEffect(() => {
    if (!projectPath) return;
    const layout = readPanelLayout(projectPath);
    const t = setTimeout(() => {
      if (layout.consoleOpen) {
        consolePanelRef.current?.resize(`${layout.consoleSize ?? 30}`);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [projectPath]);

  function toggleConsole() {
    if (consoleOpen) {
      consolePanelRef.current?.collapse();
      if (projectPath) savePanelLayout(projectPath, { consoleOpen: false });
    } else {
      const saved = projectPath ? readPanelLayout(projectPath) : {};
      consolePanelRef.current?.resize(`${saved.consoleSize ?? 30}`);
      if (projectPath) savePanelLayout(projectPath, { consoleOpen: true });
    }
  }

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
        </span>
        <div className="flex items-center gap-2 shrink-0">
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
          <button
            onClick={toggleConsole}
            onMouseEnter={() => setConsoleBtnHovered(true)}
            onMouseLeave={() => setConsoleBtnHovered(false)}
            title={consoleOpen ? "Hide console" : "Show console"}
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

      {/* Body: preview on top, console at bottom */}
      <PanelGroup orientation="vertical" className="flex-1 min-h-0">
        {/* Preview section */}
        <Panel minSize={20} className="relative min-h-0 overflow-hidden">
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
                generationId={generationId}
                isVisible={visibleId === ex.id}
              />
            ))}
        </Panel>

        {/* Drag handle — invisible and disabled when console is closed */}
        <PanelResizeHandle
          disabled={!consoleOpen}
          className="group relative flex items-center justify-center shrink-0"
          style={{
            height: consoleOpen ? 1 : 0,
            background: consoleOpen ? "#DDD9D2" : "transparent",
            cursor: consoleOpen ? "row-resize" : "default",
          }}
        >
          {consoleOpen && (
            <div className="absolute inset-x-0 -top-1 -bottom-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
          )}
        </PanelResizeHandle>

        {/* Console section */}
        <Panel
          panelRef={consolePanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={0}
          minSize={15}
          onResize={() => {
            const collapsed = consolePanelRef.current?.isCollapsed() ?? true;
            setConsoleOpen(!collapsed);
            if (!collapsed && projectPath) {
              const size = consolePanelRef.current?.getSize().asPercentage;
              if (size != null) {
                if (consoleSaveTimer.current) clearTimeout(consoleSaveTimer.current);
                consoleSaveTimer.current = setTimeout(() => {
                  savePanelLayout(projectPath, { consoleSize: size });
                }, 300);
              }
            }
          }}
          className="flex flex-col min-h-0 overflow-hidden"
        >
          <div
            className="flex items-center shrink-0 px-3"
            style={{ height: 32, background: "#ECEAE6", borderBottom: "1px solid #DDD9D2" }}
          >
            <span
              className="text-[11px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: "#8A8780" }}
            >
              Console
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "#FAFAF9" }}>
            {displayedExample ? (
              <ConsoleLog lines={displayedExample.consoleOutput} error={displayedExample.error} />
            ) : (
              <div className="text-sm px-3 py-2 font-mono" style={{ color: "#ACA89F" }}>
                Select an example to see output
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
