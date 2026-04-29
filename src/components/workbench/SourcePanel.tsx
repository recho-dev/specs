import type { RefObject } from "react";
import { Panel, type PanelImperativeHandle } from "react-resizable-panels";
import CodeEditor from "../editor/CodeEditor";
import { CollapseLeftIcon, ExpandRightIcon, IconButton } from "./UI";

export default function SourcePanel({
  panelRef,
  elementRef,
  showVerticalBar,
  hasSource,
  sourceValue,
  isStreaming,
  onToggleSource,
  onResize,
}: {
  panelRef: RefObject<PanelImperativeHandle | null>;
  elementRef: RefObject<HTMLDivElement | null>;
  showVerticalBar: boolean;
  hasSource: boolean;
  sourceValue: string;
  isStreaming: boolean;
  onToggleSource: () => void;
  onResize: () => void;
}) {
  return (
    <Panel
      panelRef={panelRef}
      elementRef={elementRef}
      collapsible
      collapsedSize="40px"
      defaultSize={30}
      minSize={15}
      onResize={onResize}
      className="flex flex-col overflow-hidden"
    >
      {showVerticalBar ? (
        <div className="h-full flex flex-col items-center" style={{ background: "#ECEAE6", width: 40, borderRight: "1px solid #DDD9D2" }}>
          <div style={{ padding: "9px 0" }}>
            <IconButton onClick={onToggleSource} title="Expand source">
              <ExpandRightIcon />
            </IconButton>
          </div>
          <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={onToggleSource}>
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
          <div className="flex items-center justify-between shrink-0 px-5" style={{ height: 40, background: "#ECEAE6", borderBottom: "1px solid #DDD9D2" }}>
            <span className="text-[13px] font-semibold tracking-[0.06em] uppercase" style={{ color: "#3A3834" }}>
              Source
            </span>
            <IconButton onClick={onToggleSource} title="Collapse source">
              <CollapseLeftIcon />
            </IconButton>
          </div>
          <div className="flex-1 min-h-0">
            {hasSource ? (
              <CodeEditor value={sourceValue} readOnly isStreaming={isStreaming} editorBackground="#F5F4F2" />
            ) : (
              <div className="text-sm px-5 pt-5" style={{ color: "#ACA89F" }}>
                Generated library source will appear here
              </div>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

