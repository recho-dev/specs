import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

interface Props {
  exampleId: string;
  exampleCode: string;
  libraryCode: string;
  generationId: number;
  isVisible: boolean;
}

export interface PreviewFrameHandle {
  sendGetSnapshot: (exampleId: string) => void;
}

const PreviewFrame = forwardRef<PreviewFrameHandle, Props>(function PreviewFrame(
  { exampleId, exampleCode, libraryCode, generationId, isVisible },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ libraryCode: string; exampleCode: string } | null>(null);

  useImperativeHandle(ref, () => ({
    sendGetSnapshot: (id: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "GET_SNAPSHOT", exampleId: id },
        "*"
      );
    },
  }));

  function sendRunCode(lc: string, ec: string) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "RUN_CODE", exampleId, libraryCode: lc, exampleCode: ec },
      "*"
    );
  }

  function handleLoad() {
    readyRef.current = true;
    if (pendingRef.current) {
      sendRunCode(pendingRef.current.libraryCode, pendingRef.current.exampleCode);
      pendingRef.current = null;
    }
  }

  useEffect(() => {
    if (!libraryCode.trim()) return;
    if (readyRef.current) {
      sendRunCode(libraryCode, exampleCode);
    } else {
      pendingRef.current = { libraryCode, exampleCode };
    }
  }, [libraryCode, exampleCode, generationId]);

  return (
    <iframe
      ref={iframeRef}
      src="app://./sandbox.html"
      sandbox="allow-scripts allow-same-origin"
      onLoad={handleLoad}
      style={{ display: isVisible ? "block" : "none" }}
      className="w-full h-full border-0 bg-white"
      title={`Preview: ${exampleId}`}
    />
  );
});

export default PreviewFrame;
