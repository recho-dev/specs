import type { RefObject } from "react";
import { ChatIcon, ClockIcon, SendIcon, SpinnerIcon } from "./UI";

export type FooterMode = null | "ask";

export default function Footer({
  aiInput,
  footerMode,
  askInputRef,
  isGenerating,
  isProcessing,
  canGenerate,
  onAiInputChange,
  onSendAsk,
  onToggleAsk,
  onOpenVersions,
  onGenerate,
}: {
  aiInput: string;
  footerMode: FooterMode;
  askInputRef: RefObject<HTMLInputElement | null>;
  isGenerating: boolean;
  isProcessing: boolean;
  canGenerate: boolean;
  onAiInputChange: (value: string) => void;
  onSendAsk: () => void;
  onToggleAsk: () => void;
  onOpenVersions: () => void;
  onGenerate: () => void;
}) {
  const generateDisabled = isProcessing || !canGenerate;
  const generateBg = isGenerating
    ? "#8A7FD0"
    : !canGenerate || isProcessing
    ? "#C4C0D8"
    : "#5B47D0";

  return (
    <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid #DDD9D2", background: "#ECEAE6" }}>
      <div className="flex flex-col gap-2">
        {footerMode === "ask" && (
          <div
            className="flex items-center"
            style={{
              height: 36,
              borderRadius: 8,
              paddingLeft: 10,
              paddingRight: 6,
              background:
                "linear-gradient(#FAF9F7, #FAF9F7) padding-box, linear-gradient(135deg, #E879A0, #8B7FF0) border-box",
              border: "2px solid transparent",
            }}
          >
            <input
              ref={askInputRef}
              type="text"
              value={aiInput}
              onChange={(e) => onAiInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSendAsk();
                if (e.key === "Escape") onToggleAsk();
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
              onClick={onSendAsk}
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled}
            title={!canGenerate && !isProcessing ? "No changes since last generation" : undefined}
            style={{
              flex: 1,
              height: 34,
              borderRadius: 6,
              border: "none",
              background: generateBg,
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: generateDisabled ? "default" : "pointer",
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
            onClick={onToggleAsk}
            disabled={isProcessing}
            title="Chat"
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              border: "1px solid #CCC8C0",
              background: footerMode === "ask" ? "#EAE7F5" : "#FAF9F7",
              color: footerMode === "ask" ? "#5B47D0" : "#8A8780",
              cursor: isProcessing ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (isProcessing) return;
              (e.currentTarget as HTMLButtonElement).style.background = footerMode === "ask" ? "#EAE7F5" : "#DDD9D2";
              (e.currentTarget as HTMLButtonElement).style.color = footerMode === "ask" ? "#5B47D0" : "#3A3834";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = footerMode === "ask" ? "#EAE7F5" : "#FAF9F7";
              (e.currentTarget as HTMLButtonElement).style.color = footerMode === "ask" ? "#5B47D0" : "#8A8780";
            }}
          >
            <ChatIcon />
          </button>

          <button
            type="button"
            onClick={onOpenVersions}
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
  );
}
