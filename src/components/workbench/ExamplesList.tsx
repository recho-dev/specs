import { useRef, useState, useEffect } from "react";
import type { RefObject } from "react";
import { MoreHorizontal, Play } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import type { CodeEditorHandle } from "../editor/CodeEditor";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Example } from "@/types";
import CodeEditor from "../editor/CodeEditor";
import {
  AddExampleButton,
  ChevronIcon,
  DragHandleIcon,
  FileIcon,
  InsertBetweenButton,
  StatusBadge,
} from "./UI";

type ExamplesListProps = {
  examples: Example[];
  activeExampleId: string | null;
  addExample: () => void;
  insertExampleAt: (index: number) => void;
  deleteExample: (id: string) => void;
  setActiveExample: (id: string) => void;
  setExampleCode: (id: string, code: string) => void;
  setExampleName: (id: string, name: string) => void;
  renamingExampleId: string | null;
  setRenamingExampleId: (id: string | null) => void;
  renameDraft: string;
  setRenameDraft: (value: string) => void;
  renameInputRef: RefObject<HTMLInputElement | null>;
  insertHoverAfterId: string | null;
  setInsertHoverAfterId: (id: string | null | ((cur: string | null) => string | null)) => void;
  isExpanded: (id: string) => boolean;
  toggleExpand: (id: string) => void;
  reorderExamples: (orderedIds: string[]) => void;
  displayTitle: (name: string) => string;
  requestSnapshotCapture: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  onOpenSnapshotModal: (id: string) => void;
};

type CardProps = ExamplesListProps & {
  ex: Example;
  idx: number;
  isLast: boolean;
};

const ICON_BTN: React.CSSProperties = {
  width: 18, height: 18,
  display: "flex", alignItems: "center", justifyContent: "center",
  border: "none", background: "none",
  color: "#ACA89F", cursor: "pointer", borderRadius: 3, padding: 0,
};

const MENU_ITEM_BASE: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  padding: "7px 12px", border: "none", background: "none",
  fontSize: 12.5, fontWeight: 500, color: "#3A3834",
  cursor: "pointer", fontFamily: "inherit",
};

function SortableExampleCard(props: CardProps) {
  const { ex, idx, isLast, activeExampleId, renamingExampleId, insertHoverAfterId } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.id });

  const isActive = ex.id === activeExampleId;
  const expanded = props.isExpanded(ex.id);
  const isRenaming = renamingExampleId === ex.id;
  const hasSnapshot = !!ex.snapshotId;
  const canCapture = ex.status === "pass";

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  const wrapperStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={wrapperStyle} className="shrink-0">
      {isDragging && (
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 42,
            borderRadius: 8, border: "1px dashed #C5C0F0",
            background: "#F0EEFF", zIndex: 1, pointerEvents: "none",
          }}
        />
      )}

      <div style={{ visibility: isDragging ? "hidden" : "visible" }}>
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: isActive ? "1px solid #8B7FF0" : "1px solid #DDD9D2",
            background: "#FDFCFA",
            boxShadow: isActive ? "0 0 0 2.5px rgba(139,127,240,0.15)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            cursor: "pointer",
          }}
          onClick={() => props.setActiveExample(ex.id)}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 shrink-0"
            style={{
              height: 42,
              borderBottom: expanded ? "1px solid #EBE8E2" : "1px solid transparent",
              background: isActive ? "#F8F6FF" : "transparent",
            }}
          >
            {/* Drag handle */}
            <span
              {...attributes}
              {...listeners}
              style={{ color: "#ACA89F", flexShrink: 0, display: "flex", alignItems: "center", cursor: "grab", touchAction: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              <DragHandleIcon />
            </span>

            {isActive ? (
              <button
                title="Run example"
                onClick={(e) => {
                  e.stopPropagation();
                  useWorkbenchStore.getState().requestRun(ex.id);
                }}
                style={{
                  ...ICON_BTN,
                  color: "#8B7FF0",
                  width: 20, height: 20,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#EBE9FF";
                  (e.currentTarget as HTMLButtonElement).style.color = "#5B47D0";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                  (e.currentTarget as HTMLButtonElement).style.color = "#8B7FF0";
                }}
              >
                <Play size={13} fill="currentColor" />
              </button>
            ) : (
              <span style={{ color: "#ACA89F", flexShrink: 0, display: "flex", alignItems: "center" }}>
                <FileIcon />
              </span>
            )}

            {/* Name / rename input */}
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  ref={props.renameInputRef}
                  value={props.renameDraft}
                  onChange={(e) => props.setRenameDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault(); e.stopPropagation();
                      props.setRenamingExampleId(null); props.setRenameDraft("");
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault(); e.stopPropagation();
                      const next = props.renameDraft.trim();
                      if (next) props.setExampleName(ex.id, next);
                      props.setRenamingExampleId(null); props.setRenameDraft("");
                    }
                  }}
                  onBlur={() => {
                    const next = props.renameDraft.trim();
                    if (next) props.setExampleName(ex.id, next);
                    props.setRenamingExampleId(null); props.setRenameDraft("");
                  }}
                  style={{
                    width: "100%", fontSize: "13px", fontWeight: 500, color: "#3A3834",
                    background: "white", border: "1px solid #DDD9D2", borderRadius: 6,
                    padding: "4px 8px", outline: "none",
                  }}
                />
              ) : (
                <span
                  className="block min-w-0 truncate"
                  style={{ fontSize: "13px", fontWeight: 500, color: "#3A3834", cursor: isActive ? "text" : "default" }}
                  title={isActive ? "Click to rename" : undefined}
                  onClick={(e) => {
                    if (!isActive) return;
                    e.stopPropagation();
                    props.setRenamingExampleId(ex.id);
                    props.setRenameDraft(ex.name);
                  }}
                >
                  {props.displayTitle(ex.name)}
                </span>
              )}
            </div>

            {/* Status + actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge
                status={ex.status}
                snapshotStatus={ex.snapshotStatus}
                onClick={ex.snapshotStatus === "fail" ? () => props.onOpenSnapshotModal(ex.id) : undefined}
              />
              {/* Passive snapshot indicator */}
              {hasSnapshot && ex.snapshotStatus !== "fail" && (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  padding: "2px 6px", borderRadius: 4,
                  background: "#EBE9FF", color: "#5B47D0",
                  letterSpacing: "0.03em", flexShrink: 0,
                }}>
                  snapshot
                </span>
              )}
              {/* ⋯ menu trigger */}
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); setConfirmingDelete(false); }}
                title="More options"
                style={ICON_BTN}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#3A3834";
                  (e.currentTarget as HTMLButtonElement).style.background = "#EBE8E2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#ACA89F";
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                <MoreHorizontal size={14} />
              </button>
              {/* Expand / collapse */}
              <button
                onClick={(e) => { e.stopPropagation(); props.toggleExpand(ex.id); }}
                title={expanded ? "Collapse" : "Expand"}
                style={ICON_BTN}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3A3834"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ACA89F"; }}
              >
                <ChevronIcon open={expanded} />
              </button>
            </div>
          </div>

          {/* Editor */}
          <div style={expanded ? undefined : { height: 0, overflow: "hidden" }}>
            <CodeEditor ref={codeEditorRef} value={ex.code} onChange={(v) => props.setExampleCode(ex.id, v)} editorBackground="#FDFCFA" autoHeight />
          </div>
        </div>

        {/* Dropdown menu — outside overflow-hidden so it's never clipped */}
        {menuOpen && (
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", right: 0, top: 46, zIndex: 50,
              width: 192, background: "#FFFFFF",
              border: "1px solid #DDD9D2", borderRadius: 8,
              boxShadow: "0 10px 30px rgba(20,18,14,0.10)",
              padding: "4px 0",
              animation: "slideDown 0.12s cubic-bezier(.22,.68,0,1.2)",
            }}
          >
            <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {confirmingDelete ? (
              /* Inline delete confirmation */
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#3A3834", marginBottom: 3 }}>
                  Delete example?
                </div>
                <div style={{ fontSize: 11.5, color: "#8A8780", lineHeight: 1.4, marginBottom: 10 }}>
                  This cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #DDD9D2", background: "#ECEAE6", color: "#3A3834", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { props.deleteExample(ex.id); setMenuOpen(false); }}
                    style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #C0392B", background: "#C0392B", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* View Diff — only when mismatch */}
                {ex.snapshotStatus === "fail" && (
                  <button
                    style={MENU_ITEM_BASE}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5F4F2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    onClick={() => { props.onOpenSnapshotModal(ex.id); setMenuOpen(false); }}
                  >
                    View Diff
                  </button>
                )}

                {/* Take / Update snapshot */}
                <button
                  disabled={!canCapture}
                  style={{ ...MENU_ITEM_BASE, color: canCapture ? "#3A3834" : "#C0BAB0", cursor: canCapture ? "pointer" : "default" }}
                  onMouseEnter={(e) => { if (canCapture) (e.currentTarget as HTMLButtonElement).style.background = "#F5F4F2"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  onClick={() => { if (canCapture) { props.requestSnapshotCapture(ex.id); setMenuOpen(false); } }}
                  title={canCapture ? undefined : "Run example first"}
                >
                  {hasSnapshot ? "Update Snapshot" : "Take Snapshot"}
                </button>

                {/* Delete snapshot — only if one exists */}
                {hasSnapshot && (
                  <button
                    style={MENU_ITEM_BASE}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5F4F2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                    onClick={() => { props.deleteSnapshot(ex.id); setMenuOpen(false); }}
                  >
                    Delete Snapshot
                  </button>
                )}

                {/* Format */}
                <button
                  style={MENU_ITEM_BASE}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5F4F2"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  onClick={() => { codeEditorRef.current?.format(); setMenuOpen(false); }}
                >
                  Format
                </button>

                <div style={{ height: 1, background: "#EBE8E2", margin: "4px 0" }} />

                {/* Delete example */}
                <button
                  style={{ ...MENU_ITEM_BASE, color: "#C0392B" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FFF0EE"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete Example
                </button>
              </>
            )}
          </div>
        )}

        {!isLast && (
          <div
            onMouseEnter={() => props.setInsertHoverAfterId(ex.id)}
            onMouseLeave={() => props.setInsertHoverAfterId((cur) => (cur === ex.id ? null : cur))}
            style={{
              position: "absolute", left: 0, right: 0, top: "100%",
              height: 16, display: "flex", alignItems: "center",
              justifyContent: "center", pointerEvents: "auto", zIndex: 20,
            }}
          >
            <div style={{ opacity: insertHoverAfterId === ex.id ? 1 : 0, transition: "opacity 0.12s" }}>
              <InsertBetweenButton onClick={() => props.insertExampleAt(idx + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardDragOverlay({ ex, displayTitle }: { ex: Example; displayTitle: (n: string) => string }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid #8B7FF0", background: "#FDFCFA", boxShadow: "0 8px 24px rgba(139,127,240,0.25)" }}
    >
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: 42, background: "#F8F6FF" }}
      >
        <span style={{ color: "#ACA89F", flexShrink: 0, display: "flex", alignItems: "center", cursor: "grabbing" }}>
          <DragHandleIcon />
        </span>
        <span style={{ color: "#8B7FF0", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <FileIcon />
        </span>
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: "13px", fontWeight: 500, color: "#3A3834" }}>
          {displayTitle(ex.name)}
        </span>
        <StatusBadge status={ex.status} snapshotStatus={ex.snapshotStatus} />
      </div>
    </div>
  );
}

export default function ExamplesList(props: ExamplesListProps) {
  const { examples, addExample, isExpanded, toggleExpand, reorderExamples } = props;
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeExample = activeId ? examples.find((e) => e.id === activeId) ?? null : null;
  const dragStartExpandedRef = useRef(false);

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    dragStartExpandedRef.current = isExpanded(id);
    if (dragStartExpandedRef.current) toggleExpand(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = event.active.id as string;
    setActiveId(null);
    if (dragStartExpandedRef.current && !isExpanded(id)) toggleExpand(id);
    dragStartExpandedRef.current = false;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = examples.map((e) => e.id);
      const oldIdx = ids.indexOf(id);
      const newIdx = ids.indexOf(over.id as string);
      reorderExamples(arrayMove(ids, oldIdx, newIdx));
    }
  }

  function handleDragCancel() {
    const id = activeId;
    setActiveId(null);
    if (id && dragStartExpandedRef.current && !isExpanded(id)) toggleExpand(id);
    dragStartExpandedRef.current = false;
  }

  if (examples.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-center" style={{ color: "#ACA89F" }}>
          No examples yet
          <br />
          Add one to get started
        </p>
        <AddExampleButton onClick={addExample} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "14px 14px 0" }}>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={examples.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {examples.map((ex, idx) => (
              <SortableExampleCard
                key={ex.id}
                {...props}
                ex={ex}
                idx={idx}
                isLast={idx === examples.length - 1}
              />
            ))}
            <AddExampleButton onClick={addExample} />
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeExample ? (
            <CardDragOverlay ex={activeExample} displayTitle={props.displayTitle} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
