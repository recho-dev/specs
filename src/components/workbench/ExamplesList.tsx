import type { RefObject } from "react";
import { Trash2 } from "lucide-react";
import type { Example } from "@/types";
import CodeEditor from "../editor/CodeEditor";
import { AddExampleButton, ChevronIcon, FileIcon, InsertBetweenButton, StatusBadge } from "./UI";

export default function ExamplesList({
  examples,
  activeExampleId,
  addExample,
  insertExampleAt,
  deleteExample,
  setActiveExample,
  setExampleCode,
  setExampleName,
  renamingExampleId,
  setRenamingExampleId,
  renameDraft,
  setRenameDraft,
  renameInputRef,
  insertHoverAfterId,
  setInsertHoverAfterId,
  confirmDeleteId,
  setConfirmDeleteId,
  confirmPopupRef,
  isExpanded,
  toggleExpand,
  displayTitle,
}: {
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
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  confirmPopupRef: RefObject<HTMLDivElement | null>;
  isExpanded: (id: string) => boolean;
  toggleExpand: (id: string) => void;
  displayTitle: (name: string) => string;
}) {
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
                        {displayTitle(ex.name)}
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
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#3A3834", marginBottom: 3 }}>Delete example?</div>
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
                  <CodeEditor value={ex.code} onChange={(v) => setExampleCode(ex.id, v)} editorBackground="#FDFCFA" autoHeight />
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
                    height: 16,
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
  );
}

