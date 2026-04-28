import { useState } from "react";
import { File, ChevronDown, PanelLeftClose, PanelLeftOpen, Plus, CirclePlus, Clock, ArrowUp, Loader2 } from "lucide-react";
import type { ExampleStatus } from "@/types";

export function FileIcon() {
  return <File size={16} />;
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={16}
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
    />
  );
}

export function CollapseLeftIcon() {
  return <PanelLeftClose size={16} />;
}

export function ExpandRightIcon() {
  return <PanelLeftOpen size={16} />;
}

export function PlusIcon() {
  return <Plus size={16} />;
}

export function ClockIcon() {
  return <Clock size={16} />;
}

export function SendIcon() {
  return <ArrowUp size={16} />;
}

export function SpinnerIcon() {
  return <Loader2 size={16} className="animate-spin" />;
}

export function InsertBetweenButton({ onClick }: { onClick: () => void }) {
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

export function StatusBadge({ status }: { status: ExampleStatus }) {
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

export function IconButton({
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

export function AddExampleButton({ onClick }: { onClick: () => void }) {
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

