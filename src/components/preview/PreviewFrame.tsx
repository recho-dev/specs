import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

interface Props {
  exampleId: string;
  exampleCode: string;
  libraryCode: string;
  isVisible: boolean;
}

export interface PreviewFrameHandle {
  sendGetSnapshot: (exampleId: string) => void;
  run: () => void;
}

const PreviewFrame = forwardRef<PreviewFrameHandle, Props>(function PreviewFrame(
  { exampleId, exampleCode, libraryCode, isVisible },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const latestRef = useRef({ libraryCode, exampleCode });

  useEffect(() => {
    latestRef.current = { libraryCode, exampleCode };
  }, [libraryCode, exampleCode]);

  function sendRunCode(lc: string, ec: string) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "RUN_CODE", exampleId, libraryCode: lc, exampleCode: ec },
      "*"
    );
  }

  useImperativeHandle(ref, () => ({
    sendGetSnapshot: (id: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "GET_SNAPSHOT", exampleId: id },
        "*"
      );
    },
    run: () => {
      const { libraryCode: lc, exampleCode: ec } = latestRef.current;
      if (readyRef.current) sendRunCode(lc, ec);
    },
  }));

  function handleLoad() {
    readyRef.current = true;
  }

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
