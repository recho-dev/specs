import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle } from "react-resizable-panels";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import { ipc } from "@/lib/ipc";
import { readPanelLayout, savePanelLayout } from "@/lib/panelLayout";
import PreviewPanel from "./preview/PreviewPanel";
import AIPanel, { type AIPanelMode, type ApiKeyStatus } from "./AIPanel";
import Footer, { type FooterMode } from "./workbench/Footer";
import SourcePanel from "./workbench/SourcePanel";
import ExamplesList from "./workbench/ExamplesList";
import VersionsModal from "./workbench/VersionsModal";

const EMPTY_SOURCE_PLACEHOLDER = `// Library source appears after generation.\n// No need to edit this file manually.`;

function exampleDisplayTitle(name: string) {
  return /\.\w+$/.test(name) ? name : `${name}.js`;
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
  const reorderExamples = useWorkbenchStore((s) => s.reorderExamples);
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
  const [footerMode, setFooterMode] = useState<FooterMode>(null);
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

  function handleSourceResize() {
    const collapsed = sourcePanelRef.current?.isCollapsed() ?? false;
    setSourceCollapsed(collapsed);
    if (!isAnimating.current) {
      setShowVerticalBar(collapsed);
      if (collapsed && projectPath) {
        savePanelLayout(projectPath, { sourceCollapsed: true });
      }
    }
    if (!collapsed) saveHorizontalSizes();
  }

  return (
    <div className="h-full overflow-hidden" style={{ background: "#F5F4F2" }}>
      <PanelGroup orientation="horizontal" className="h-full">

        {/* ── SOURCE ── */}
        <SourcePanel
          panelRef={sourcePanelRef}
          elementRef={sourceElementRef}
          showVerticalBar={showVerticalBar}
          hasSource={hasSource}
          sourceValue={sourceValue}
          onToggleSource={handleToggleSource}
          onResize={handleSourceResize}
        />

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

          <ExamplesList
            examples={examples}
            activeExampleId={activeExampleId}
            addExample={addExample}
            insertExampleAt={insertExampleAt}
            deleteExample={deleteExample}
            setActiveExample={setActiveExample}
            setExampleCode={setExampleCode}
            setExampleName={setExampleName}
            renamingExampleId={renamingExampleId}
            setRenamingExampleId={setRenamingExampleId}
            renameDraft={renameDraft}
            setRenameDraft={setRenameDraft}
            renameInputRef={renameInputRef}
            insertHoverAfterId={insertHoverAfterId}
            setInsertHoverAfterId={setInsertHoverAfterId}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            confirmPopupRef={confirmPopupRef}
            isExpanded={isExpanded}
            toggleExpand={toggleExpand}
            reorderExamples={reorderExamples}
            displayTitle={exampleDisplayTitle}
          />

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
          <Footer
            aiInput={aiInput}
            footerMode={footerMode}
            askInputRef={askInputRef}
            isGenerating={isGenerating}
            onAiInputChange={setAiInput}
            onSendAsk={handleSendAsk}
            onToggleAsk={handleAskAiClick}
            onOpenVersions={() => setVersionsOpen(true)}
            onGenerate={handleGenerateClick}
          />
        </Panel>

        <PanelResizeHandle onPointerDown={cancelAnimation} className="group relative flex items-center justify-center" style={{ width: 1, background: "#DDD9D2", cursor: "col-resize" }}>
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#8B7FF0]/20 group-data-[resize-handle-active]:bg-[#8B7FF0]/30 transition-colors" />
        </PanelResizeHandle>

        {/* ── PREVIEW ── */}
        <Panel panelRef={previewPanelRef} defaultSize={30} minSize={18} onResize={saveHorizontalSizes} className="flex flex-col overflow-hidden">
          <PreviewPanel />
        </Panel>
      </PanelGroup>

      <VersionsModal open={versionsOpen} onClose={() => setVersionsOpen(false)} />
    </div>
  );
}
