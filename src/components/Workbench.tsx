import { useState, useRef, useEffect } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { ExampleStatus } from "@/types";
import { ipc } from "@/lib/ipc";
import CodeEditor from "./editor/CodeEditor";
import PreviewPanel from "./preview/PreviewPanel";
import AIPanel, { type AIPanelMode, type ApiKeyStatus } from "./AIPanel";

const EMPTY_SOURCE_PLACEHOLDER = `// Library source appears after generation.\n// No need to edit this file manually.`;

function exampleDisplayTitle(name: string) {
  return /\.\w+$/.test(name) ? name : `${name}.js`;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" width={14} height={14}>
      <path d="M3 1h5.5L11 3.5V13H3V1z" />
      <path d="M8.5 1v3H11" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
    >
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#1E8847" strokeWidth="1.8">
      <path d="M1.5 5.5l3 3 5-5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 1v8M1 5h8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="18 8" />
    </svg>
  );
}

function StatusBadge({ status }: { status: ExampleStatus }) {
  if (status === "idle") return null;
  const styles: Record<string, { bg: string; color: string }> = {
    running: { bg: "#FFF3DC", color: "#B07010" },
    pass: { bg: "#E2F5EB", color: "#1E8847" },
    fail: { bg: "#FDECEA", color: "#C0392B" },
  };
  const s = styles[status];
  if (!s) return null;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: "2px 6px",
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.03em",
        animation: status === "running" ? "status-pulse 1s ease-in-out infinite" : "none",
      }}
    >
      {status}
    </span>
  );
}

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 22,
        height: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: hovered ? "#DDD9D2" : "none",
        color: hovered ? "#3A3834" : "#8A8780",
        borderRadius: 4,
        cursor: "pointer",
        transition: "background 0.12s, color 0.12s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function AddExampleButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 40,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        border: `1.5px dashed ${hovered ? "#8B7FF0" : "#CCC8C0"}`,
        borderRadius: 6,
        background: hovered ? "#F5F3FF" : "none",
        color: hovered ? "#5B47D0" : "#9E9A91",
        fontSize: "13px",
        cursor: "pointer",
        marginBottom: 10,
        transition: "border-color 0.12s, color 0.12s, background 0.12s",
      }}
    >
      <PlusIcon /> Add example
    </button>
  );
}

export default function Workbench() {
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const streamBuffer = useWorkbenchStore((s) => s.library.streamBuffer);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);

  const specQuestion = useWorkbenchStore((s) => s.specQuestion);
  const aiMessage = useWorkbenchStore((s) => s.aiMessage);
  const aiMessageLoading = useWorkbenchStore((s) => s.aiMessageLoading);
  const addExample = useWorkbenchStore((s) => s.addExample);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const setExampleCode = useWorkbenchStore((s) => s.setExampleCode);
  const generate = useWorkbenchStore((s) => s.generate);
  const refine = useWorkbenchStore((s) => s.refine);
  const answerSpecQuestion = useWorkbenchStore((s) => s.answerSpecQuestion);
  const dismissAiMessage = useWorkbenchStore((s) => s.dismissAiMessage);

  const [aiInput, setAiInput] = useState("");
  const [footerMode, setFooterMode] = useState<null | 'ask' | 'generate'>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [apiKeyRequested, setApiKeyRequested] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [apiKeySavedMsg, setApiKeySavedMsg] = useState<string | null>(null);

  // Derive panel mode with priority: api-key > spec-question > message
  const panelMode: AIPanelMode =
    apiKeyRequested ? 'api-key' :
    specQuestion ? 'spec-question' :
    (aiMessageLoading || aiMessage || apiKeySavedMsg) ? 'message' :
    null;

  const sourceValue = isGenerating ? streamBuffer : libraryCode || EMPTY_SOURCE_PLACEHOLDER;
  const hasSource = !!(libraryCode || isGenerating);

  async function handleGenerateClick() {
    const hasKey = await ipc.hasApiKey();
    if (!hasKey) { setApiKeyRequested(true); return; }
    setAiInput("Generate the library based on the existing examples");
    setFooterMode('generate');
    generate().catch(() => {}).finally(() => {
      setFooterMode(null);
      setAiInput('');
    });
  }

  function handleAskAiClick() {
    if (footerMode === 'ask') {
      setFooterMode(null);
      setAiInput('');
      return;
    }
    setFooterMode('ask');
    setAiInput('');
  }

  async function handleSendAsk() {
    const trimmed = aiInput.trim();
    if (!trimmed) return;
    const hasKey = await ipc.hasApiKey();
    if (!hasKey) { setApiKeyRequested(true); return; }
    setAiInput('');
    setFooterMode(null);
    refine(trimmed).catch(() => {});
  }

  useEffect(() => {
    if (footerMode === 'ask') {
      setTimeout(() => askInputRef.current?.focus(), 0);
    }
  }, [footerMode]);

  async function handleSaveApiKey(key: string) {
    setIsSaving(true);
    setApiKeyStatus(null);

    const result = await ipc.validateApiKey(key).catch(() => ({ valid: false as const, reason: 'Could not reach the Anthropic API.' }));

    if (!result.valid) {
      setIsSaving(false);
      setApiKeyStatus({ ok: false, text: 'reason' in result ? result.reason : 'Validation failed.' });
      return;
    }

    await ipc.setApiKey(key).catch(() => {});
    setApiKeyRequested(false);
    setApiKeyStatus(null);
    setIsSaving(false);
    setApiKeySavedMsg('Key saved successfully! Click **Generate** to get started.');
  }

  function handleDismissPanel() {
    setApiKeyRequested(false);
    setApiKeySavedMsg(null);
    dismissAiMessage();
  }

  function handleCopy() {
    if (!libraryCode) return;
    navigator.clipboard.writeText(libraryCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function isExpanded(id: string): boolean {
    return expandedCards[id] !== false;
  }

  function toggleExpand(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  }

  return (
    <div className="h-full overflow-hidden" style={{ background: "#F5F4F2" }}>
      <PanelGroup orientation="horizontal" className="h-full">

        {/* ── SOURCE ── */}
        <Panel defaultSize={30} minSize={12} className="flex flex-col overflow-hidden">
          <div
            className="flex items-center justify-between shrink-0 px-5"
            style={{ height: 40, background: "#ECEAE6", borderBottom: "1px solid #DDD9D2" }}
          >
            <span
              className="text-[13px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: "#3A3834" }}
            >
              Source
            </span>
            <div className="flex items-center gap-1">
              {hasSource && (
                <IconButton onClick={handleCopy} title="Copy source">
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {hasSource ? (
              <CodeEditor value={sourceValue} readOnly editorBackground="#F5F4F2" />
            ) : (
              <div className="text-sm px-5 pt-5" style={{ color: "#ACA89F" }}>
                Generated library source will appear here
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex items-center justify-center" style={{ width: 1, background: "#DDD9D2", cursor: "col-resize" }}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
        </PanelResizeHandle>

        {/* ── EXAMPLES ── */}
        <Panel defaultSize={40} minSize={15} className="flex flex-col overflow-hidden">
          <div
            className="flex items-center justify-between shrink-0 px-5"
            style={{ height: 40, background: "#ECEAE6", borderBottom: "1px solid #DDD9D2" }}
          >
            <span
              className="text-[13px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: "#3A3834" }}
            >
              Examples
            </span>
            <div className="flex items-center gap-1.5">
              {examples.length > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#E4E1DA",
                    color: "#6E6A62",
                    letterSpacing: "0.03em",
                  }}
                >
                  {examples.length} {examples.length === 1 ? "example" : "examples"}
                </span>
              )}
            </div>
          </div>

          {examples.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <p className="text-sm text-center" style={{ color: "#ACA89F" }}>
                No examples yet
                <br />
                Add one to get started
              </p>
              <AddExampleButton onClick={addExample} />
            </div>
          ) : null}

          {examples.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "14px 14px 0" }}>
            <div className="flex flex-col gap-3">
              {examples.map((ex) => {
                const isActive = ex.id === activeExampleId;
                const expanded = isExpanded(ex.id);
                return (
                  <div
                    key={ex.id}
                    className="rounded-lg overflow-hidden shrink-0"
                    style={{
                      border: isActive ? "1px solid #8B7FF0" : "1px solid #DDD9D2",
                      background: "#FDFCFA",
                      boxShadow: isActive ? "0 0 0 2.5px rgba(139,127,240,0.15)" : "none",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      cursor: "pointer",
                    }}
                    onClick={() => setActiveExample(ex.id)}
                  >
                    <div
                      className="flex items-center gap-2 px-4 shrink-0"
                      style={{
                        height: 42,
                        borderBottom: expanded ? "1px solid #EBE8E2" : "1px solid transparent",
                        background: isActive ? "#F8F6FF" : "transparent",
                      }}
                    >
                      <span style={{ color: "#8B7FF0", flexShrink: 0, display: "flex", alignItems: "center" }}>
                        <FileIcon />
                      </span>
                      <span
                        className="flex-1 min-w-0 truncate"
                        style={{ fontSize: "13px", fontWeight: 500, color: "#3A3834" }}
                      >
                        {exampleDisplayTitle(ex.name)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={ex.status} />
                        {isActive && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#EBE9FF",
                              color: "#5B47D0",
                              letterSpacing: "0.03em",
                            }}
                          >
                            active
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(ex.id);
                          }}
                          title={expanded ? "Collapse" : "Expand"}
                          style={{
                            width: 18,
                            height: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            background: "none",
                            color: "#ACA89F",
                            cursor: "pointer",
                            borderRadius: 3,
                            padding: 0,
                          }}
                        >
                          <ChevronIcon open={expanded} />
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <CodeEditor
                        value={ex.code}
                        onChange={(v) => setExampleCode(ex.id, v)}
                        editorBackground="#FDFCFA"
                        autoHeight
                      />
                    )}
                  </div>
                );
              })}
              <AddExampleButton onClick={addExample} />
            </div>
          </div>
          )}

          {/* AI Panel */}
          <AIPanel
            mode={panelMode}
            specQuestion={specQuestion}
            aiMessage={apiKeySavedMsg ?? aiMessage}
            aiMessageLoading={aiMessageLoading}
            apiKeyStatus={apiKeyStatus}
            isSaving={isSaving}
            onDismiss={handleDismissPanel}
            onAnswerSpec={(answer) => answerSpecQuestion(answer).catch(() => {})}
            onSaveApiKey={handleSaveApiKey}
          />

          {/* Footer: generate + ask AI */}
          <div
            className="shrink-0 px-4 py-3"
            style={{ borderTop: "1px solid #DDD9D2", background: "#ECEAE6" }}
          >
            <div className="flex flex-col gap-2">
              {/* Input row — visible when a footer mode is active */}
              {footerMode && (
                <div
                  className="flex items-center"
                  style={{
                    height: 36,
                    borderRadius: 8,
                    paddingLeft: 10,
                    paddingRight: 6,
                    background: footerMode === 'generate'
                      ? "linear-gradient(#F0EDE8, #F0EDE8) padding-box, linear-gradient(135deg, #CCC8C0, #ACA89F) border-box"
                      : "linear-gradient(#FAF9F7, #FAF9F7) padding-box, linear-gradient(135deg, #E879A0, #8B7FF0) border-box",
                    border: "2px solid transparent",
                  }}
                >
                  <input
                    ref={askInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => { if (footerMode === 'ask') setAiInput(e.target.value); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && footerMode === 'ask') handleSendAsk();
                      if (e.key === 'Escape') { setFooterMode(null); setAiInput(''); }
                    }}
                    readOnly={footerMode === 'generate'}
                    placeholder="Ask AI…"
                    className="flex-1 min-w-0 outline-none"
                    style={{
                      background: "transparent",
                      border: "none",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      color: "#3A3834",
                    }}
                  />
                  <button
                    type="button"
                    onClick={footerMode === 'ask' ? handleSendAsk : undefined}
                    disabled={footerMode !== 'ask' || !aiInput.trim()}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: isGenerating
                        ? "linear-gradient(135deg, #E879A0, #8B7FF0)"
                        : (footerMode === 'ask' && aiInput.trim())
                          ? "linear-gradient(135deg, #E879A0, #8B7FF0)"
                          : "#CCC8C0",
                      color: "#fff",
                      cursor: (footerMode === 'ask' && aiInput.trim()) ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isGenerating ? <SpinnerIcon /> : <SendIcon />}
                  </button>
                </div>
              )}

              {/* Main action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 6,
                    border: "none",
                    background: isGenerating ? "#8A7FD0" : "#5B47D0",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isGenerating ? "default" : "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  {isGenerating ? "Generating…" : "Generate"}
                </button>
                <button
                  type="button"
                  onClick={handleAskAiClick}
                  disabled={isGenerating}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 6,
                    border: "1px solid #CCC8C0",
                    background: footerMode === 'ask' ? "#EAE7F5" : "#FAF9F7",
                    color: footerMode === 'ask' ? "#5B47D0" : "#3A3834",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: isGenerating ? "default" : "pointer",
                    letterSpacing: "0.02em",
                  }}
                >
                  Chat
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex items-center justify-center" style={{ width: 1, background: "#DDD9D2", cursor: "col-resize" }}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
        </PanelResizeHandle>

        {/* ── PREVIEW ── */}
        <Panel defaultSize={30} minSize={15} className="flex flex-col overflow-hidden">
          <PreviewPanel />
        </Panel>
      </PanelGroup>

    </div>
  );
}
