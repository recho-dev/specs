import { useState, useRef, useEffect } from "react";
import { File, ChevronDown, PanelLeftClose, PanelLeftOpen, Plus, CirclePlus, Clock, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle } from "react-resizable-panels";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { ExampleStatus } from "@/types";
import { ipc } from "@/lib/ipc";
import { readPanelLayout, savePanelLayout } from "@/lib/panelLayout";
import CodeEditor from "./editor/CodeEditor";
import PreviewPanel from "./preview/PreviewPanel";
import AIPanel, { type AIPanelMode, type ApiKeyStatus } from "./AIPanel";
import VersionTimeline from "./versions/VersionTimeline";

const EMPTY_SOURCE_PLACEHOLDER = `// Library source appears after generation.\n// No need to edit this file manually.`;

function exampleDisplayTitle(name: string) {
  return /\.\w+$/.test(name) ? name : `${name}.js`;
}

function FileIcon() { return <File size={16} />; }
function ChevronIcon({ open }: { open: boolean }) {
  return <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />;
}
function CollapseLeftIcon() { return <PanelLeftClose size={16} />; }
function ExpandRightIcon() { return <PanelLeftOpen size={16} />; }
function PlusIcon() { return <Plus size={16} />; }
function ClockIcon() { return <Clock size={16} />; }
function SendIcon() { return <ArrowUp size={16} />; }
function SpinnerIcon() { return <Loader2 size={16} className="animate-spin" />; }

function InsertBetweenButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Insert new example"
      title="Insert new example"
      style={{
        width: 22,
        height: 22,
        border: "none",
        background: "transparent",
        color: hovered ? "#8B7FF0" : "#B9B5AE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "none",
        transition: "color 0.12s",
        position: "relative",
        zIndex: 20,
        padding: 0,
      }}
    >
      <CirclePlus size={20} strokeWidth={2} />
    </button>
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
  const projectPath = useWorkbenchStore((s) => s.projectPath);
  const examples = useWorkbenchStore((s) => s.examples);
  const activeExampleId = useWorkbenchStore((s) => s.activeExampleId);
  const libraryCode = useWorkbenchStore((s) => s.library.code);
  const streamBuffer = useWorkbenchStore((s) => s.library.streamBuffer);
  const isGenerating = useWorkbenchStore((s) => s.library.isGenerating);

  const specQuestion = useWorkbenchStore((s) => s.specQuestion);
  const aiMessage = useWorkbenchStore((s) => s.aiMessage);
  const aiMessageLoading = useWorkbenchStore((s) => s.aiMessageLoading);
  const addExample = useWorkbenchStore((s) => s.addExample);
  const insertExampleAt = useWorkbenchStore((s) => s.insertExampleAt);
  const deleteExample = useWorkbenchStore((s) => s.deleteExample);
  const setActiveExample = useWorkbenchStore((s) => s.setActiveExample);
  const setExampleCode = useWorkbenchStore((s) => s.setExampleCode);
  const setExampleName = useWorkbenchStore((s) => s.setExampleName);
  const generate = useWorkbenchStore((s) => s.generate);
  const refine = useWorkbenchStore((s) => s.refine);
  const answerSpecQuestion = useWorkbenchStore((s) => s.answerSpecQuestion);
  const dismissAiMessage = useWorkbenchStore((s) => s.dismissAiMessage);

  const [renamingExampleId, setRenamingExampleId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [insertHoverAfterId, setInsertHoverAfterId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmPopupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!renamingExampleId) return;
    // Focus/select after the input mounts
    const t = setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [renamingExampleId]);

  useEffect(() => {
    // If selection changes away, stop renaming
    if (renamingExampleId && activeExampleId !== renamingExampleId) {
      setRenamingExampleId(null);
      setRenameDraft("");
    }
  }, [activeExampleId, renamingExampleId]);

  useEffect(() => {
    if (!confirmDeleteId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDeleteId(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (confirmPopupRef.current && !confirmPopupRef.current.contains(target)) {
        setConfirmDeleteId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [confirmDeleteId]);

  const [aiInput, setAiInput] = useState("");
  const [footerMode, setFooterMode] = useState<null | 'ask'>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const askInputRef = useRef<HTMLInputElement>(null);
  const sourcePanelRef   = useRef<PanelImperativeHandle | null>(null);
  const examplesPanelRef = useRef<PanelImperativeHandle | null>(null);
  const previewPanelRef  = useRef<PanelImperativeHandle | null>(null);
  const sourceElementRef = useRef<HTMLDivElement | null>(null);
  const isAnimating      = useRef(false);
  const animationTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceCollapsed, setSourceCollapsed] = useState(false);
  const [showVerticalBar, setShowVerticalBar] = useState(false);
  const [lastSourceSize, setLastSourceSize] = useState(30);
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
    generate().catch(() => {});
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

  useEffect(() => () => cancelAnimation(), []);

  // Restore saved panel layout when a project is opened
  useEffect(() => {
    if (!projectPath) return;
    const layout = readPanelLayout(projectPath);
    const t = setTimeout(() => {
      if (layout.sourceCollapsed) {
        setShowVerticalBar(true);
        setSourceCollapsed(true);
        setLastSourceSize(layout.sourceSize ?? 30);
        sourcePanelRef.current?.collapse();
        if (layout.examplesSize != null) examplesPanelRef.current?.resize(`${layout.examplesSize}`);
        if (layout.previewSize != null) previewPanelRef.current?.resize(`${layout.previewSize}`);
      } else {
        if (layout.sourceSize != null) sourcePanelRef.current?.resize(`${layout.sourceSize}`);
        if (layout.examplesSize != null) examplesPanelRef.current?.resize(`${layout.examplesSize}`);
        if (layout.previewSize != null) previewPanelRef.current?.resize(`${layout.previewSize}`);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [projectPath]);

  function saveHorizontalSizes() {
    if (!projectPath) return;
    const collapsed = sourcePanelRef.current?.isCollapsed() ?? false;
    const examplesSize = examplesPanelRef.current?.getSize().asPercentage;
    const previewSize = previewPanelRef.current?.getSize().asPercentage;
    if (examplesSize == null || previewSize == null) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (collapsed) {
        // Don't overwrite sourceSize — only update the other two
        savePanelLayout(projectPath, { examplesSize, previewSize });
      } else {
        const sourceSize = sourcePanelRef.current?.getSize().asPercentage;
        if (sourceSize == null) return;
        savePanelLayout(projectPath, { sourceSize, examplesSize, previewSize });
      }
    }, 300);
  }

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

  const ANIM_MS = 260;

  function applyTransition() {
    if (sourceElementRef.current)
      sourceElementRef.current.style.transition = "flex 0.25s cubic-bezier(0.4,0,0.2,1)";
  }

  function clearTransition() {
    if (sourceElementRef.current)
      sourceElementRef.current.style.transition = "";
  }

  function cancelAnimation() {
    if (animationTimer.current) { clearTimeout(animationTimer.current); animationTimer.current = null; }
    clearTransition();
    isAnimating.current = false;
  }

  function handleCollapseWithEqualDistribution(sourceSize: number) {
    const exSize = examplesPanelRef.current?.getSize().asPercentage ?? 40;
    const prSize = previewPanelRef.current?.getSize().asPercentage ?? 30;
    const half = sourceSize / 2;
    const newExSize = exSize + half;
    const newPrSize = prSize + half;
    sourcePanelRef.current?.collapse();
    examplesPanelRef.current?.resize(`${newExSize}`);
    previewPanelRef.current?.resize(`${newPrSize}`);
    // Save the post-collapse sizes so restore can apply them correctly
    if (projectPath) savePanelLayout(projectPath, { examplesSize: newExSize, previewSize: newPrSize });
  }

  function handleExpandWithEqualDistribution() {
    const exSize = examplesPanelRef.current?.getSize().asPercentage ?? 50;
    const prSize = previewPanelRef.current?.getSize().asPercentage ?? 50;
    const half = lastSourceSize / 2;
    sourcePanelRef.current?.resize(`${lastSourceSize}`);
    examplesPanelRef.current?.resize(`${Math.max(exSize - half, 20)}`);
    previewPanelRef.current?.resize(`${Math.max(prSize - half, 18)}`);
  }

  function handleToggleSource() {
    cancelAnimation();
    if (sourceCollapsed) {
      if (projectPath) savePanelLayout(projectPath, { sourceCollapsed: false });
      setShowVerticalBar(false);
      applyTransition();
      isAnimating.current = true;
      handleExpandWithEqualDistribution();
      animationTimer.current = setTimeout(() => {
        clearTransition();
        isAnimating.current = false;
      }, ANIM_MS);
    } else {
      const sourceSize = sourcePanelRef.current?.getSize().asPercentage ?? 30;
      setLastSourceSize(sourceSize);
      if (projectPath) savePanelLayout(projectPath, { sourceCollapsed: true, sourceSize });
      applyTransition();
      isAnimating.current = true;
      handleCollapseWithEqualDistribution(sourceSize);
      animationTimer.current = setTimeout(() => {
        setShowVerticalBar(true);
        clearTransition();
        isAnimating.current = false;
      }, ANIM_MS);
    }
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
        <Panel
          panelRef={sourcePanelRef}
          elementRef={sourceElementRef}
          collapsible
          collapsedSize="40px"
          defaultSize={30}
          minSize={15}
          onResize={() => {
            const collapsed = sourcePanelRef.current?.isCollapsed() ?? false;
            setSourceCollapsed(collapsed);
            if (!isAnimating.current) {
              setShowVerticalBar(collapsed);
              if (collapsed && projectPath) {
                savePanelLayout(projectPath, { sourceCollapsed: true });
              }
            }
            if (!collapsed) saveHorizontalSizes();
          }}
          className="flex flex-col overflow-hidden"
        >
          {showVerticalBar ? (
            <div
              className="h-full flex flex-col items-center"
              style={{ background: "#ECEAE6", width: 40, borderRight: "1px solid #DDD9D2" }}
            >
              <div style={{ padding: "9px 0" }}>
                <IconButton onClick={handleToggleSource} title="Expand source">
                  <ExpandRightIcon />
                </IconButton>
              </div>
              <div
                className="flex-1 flex items-center justify-center cursor-pointer"
                onClick={handleToggleSource}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#8A8780",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    userSelect: "none",
                  }}
                >
                  Source
                </span>
              </div>
            </div>
          ) : (
            <>
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
                <IconButton onClick={handleToggleSource} title="Collapse source">
                  <CollapseLeftIcon />
                </IconButton>
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
            </>
          )}
        </Panel>

        <PanelResizeHandle onPointerDown={cancelAnimation} className="group relative flex items-center justify-center" style={{ width: 1, background: "#DDD9D2", cursor: "col-resize" }}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
        </PanelResizeHandle>

        {/* ── EXAMPLES ── */}
        <Panel panelRef={examplesPanelRef} defaultSize={40} minSize={20} onResize={saveHorizontalSizes} className="flex flex-col overflow-hidden">
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
            <div className="flex flex-col gap-4">
              {examples.map((ex, idx) => {
                const isActive = ex.id === activeExampleId;
                const expanded = isExpanded(ex.id);
                const isRenaming = renamingExampleId === ex.id;
                const isLast = idx === examples.length - 1;
                return (
                  <div key={ex.id} className="shrink-0" style={{ position: "relative" }}>
                    <div
                      className="rounded-lg overflow-hidden"
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
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                setRenamingExampleId(null);
                                setRenameDraft("");
                                return;
                              }
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                const next = renameDraft.trim();
                                if (next) setExampleName(ex.id, next);
                                setRenamingExampleId(null);
                                setRenameDraft("");
                              }
                            }}
                            onBlur={() => {
                              const next = renameDraft.trim();
                              if (next) setExampleName(ex.id, next);
                              setRenamingExampleId(null);
                              setRenameDraft("");
                            }}
                            style={{
                              width: "100%",
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#3A3834",
                              background: "white",
                              border: "1px solid #DDD9D2",
                              borderRadius: 6,
                              padding: "4px 8px",
                              outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            className="block min-w-0 truncate"
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#3A3834",
                              cursor: isActive ? "text" : "default",
                            }}
                            title={isActive ? "Click to rename" : undefined}
                            onClick={(e) => {
                              if (!isActive) return;
                              e.stopPropagation();
                              setRenamingExampleId(ex.id);
                              setRenameDraft(ex.name);
                            }}
                          >
                            {exampleDisplayTitle(ex.name)}
                          </span>
                        )}
                      </div>
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
                            setConfirmDeleteId(ex.id);
                          }}
                          title="Delete example"
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
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#C0392B";
                            (e.currentTarget as HTMLButtonElement).style.background = "#FDECEA";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#ACA89F";
                            (e.currentTarget as HTMLButtonElement).style.background = "none";
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                        {confirmDeleteId === ex.id && (
                          <div
                            ref={confirmPopupRef}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg"
                            style={{
                              position: "absolute",
                              right: 10,
                              top: 50,
                              zIndex: 50,
                              width: 186,
                              padding: 12,
                              background: "#FFFFFF",
                              border: "1px solid #DDD9D2",
                              boxShadow: "0 10px 30px rgba(20, 18, 14, 0.08)",
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#3A3834", marginBottom: 3 }}>
                              Delete example?
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#8A8780", lineHeight: 1.25, marginBottom: 8 }}>
                              This cannot be undone.
                            </div>
                            <div className="flex items-center justify-start gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                style={{
                                  height: 30,
                                  minWidth: 76,
                                  padding: "0 10px",
                                  borderRadius: 6,
                                  border: "1px solid #DDD9D2",
                                  background: "#ECEAE6",
                                  color: "#3A3834",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteExample(ex.id);
                                  setConfirmDeleteId(null);
                                }}
                                style={{
                                  height: 30,
                                  minWidth: 76,
                                  padding: "0 10px",
                                  borderRadius: 6,
                                  border: "1px solid #C0392B",
                                  background: "#C0392B",
                                  color: "#FFFFFF",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
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
                    <div style={expanded ? undefined : { height: 0, overflow: "hidden" }}>
                      <CodeEditor
                        value={ex.code}
                        onChange={(v) => setExampleCode(ex.id, v)}
                        editorBackground="#FDFCFA"
                        autoHeight
                      />
                    </div>
                    </div>

                    {!isLast && (
                      <div
                        onMouseEnter={() => setInsertHoverAfterId(ex.id)}
                        onMouseLeave={() => setInsertHoverAfterId((cur) => (cur === ex.id ? null : cur))}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "100%",
                          height: 16, // matches `gap-4` so spacing stays unchanged
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "auto",
                          zIndex: 20,
                        }}
                      >
                        <div style={{ opacity: insertHoverAfterId === ex.id ? 1 : 0, transition: "opacity 0.12s" }}>
                          <InsertBetweenButton onClick={() => insertExampleAt(idx + 1)} />
                        </div>
                      </div>
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
              {/* Chat input row — visible when chat mode is open */}
              {footerMode === 'ask' && (
                <div
                  className="flex items-center"
                  style={{
                    height: 36,
                    borderRadius: 8,
                    paddingLeft: 10,
                    paddingRight: 6,
                    background: "linear-gradient(#FAF9F7, #FAF9F7) padding-box, linear-gradient(135deg, #E879A0, #8B7FF0) border-box",
                    border: "2px solid transparent",
                  }}
                >
                  <input
                    ref={askInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendAsk();
                      if (e.key === 'Escape') { setFooterMode(null); setAiInput(''); }
                    }}
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
                    onClick={handleSendAsk}
                    disabled={!aiInput.trim()}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: aiInput.trim() ? "linear-gradient(135deg, #E879A0, #8B7FF0)" : "#CCC8C0",
                      color: "#fff",
                      cursor: aiInput.trim() ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <SendIcon />
                  </button>
                </div>
              )}

              {/* Main action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  disabled={isGenerating || footerMode === 'ask'}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 6,
                    border: "none",
                    background: isGenerating ? "#8A7FD0" : footerMode === 'ask' ? "#C4C0D8" : "#5B47D0",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: (isGenerating || footerMode === 'ask') ? "default" : "pointer",
                    letterSpacing: "0.02em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {isGenerating && <SpinnerIcon />}
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
                <button
                  type="button"
                  onClick={() => setVersionsOpen(true)}
                  title="Version history"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    border: "1px solid #CCC8C0",
                    background: "#FAF9F7",
                    color: "#8A8780",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#DDD9D2";
                    (e.currentTarget as HTMLButtonElement).style.color = "#3A3834";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#FAF9F7";
                    (e.currentTarget as HTMLButtonElement).style.color = "#8A8780";
                  }}
                >
                  <ClockIcon />
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle onPointerDown={cancelAnimation} className="group relative flex items-center justify-center" style={{ width: 1, background: "#DDD9D2", cursor: "col-resize" }}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
        </PanelResizeHandle>

        {/* ── PREVIEW ── */}
        <Panel panelRef={previewPanelRef} defaultSize={30} minSize={18} onResize={saveHorizontalSizes} className="flex flex-col overflow-hidden">
          <PreviewPanel />
        </Panel>
      </PanelGroup>

      {versionsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setVersionsOpen(false)}
        >
          <div
            className="overflow-hidden bg-white rounded-2xl"
            style={{ width: 720, maxWidth: "calc(100% - 24px)", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <div className="text-sm font-semibold text-zinc-900">Versions</div>
              <button onClick={() => setVersionsOpen(false)} className="text-zinc-500 hover:text-zinc-900 text-lg leading-none">
                ×
              </button>
            </div>
            <div className="p-2">
              <VersionTimeline defaultOpen hideHeader />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
