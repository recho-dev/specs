"use client";

import { useRef, useEffect } from "react";

interface Props {
  exampleId: string;
  exampleCode: string;
  libraryCode: string;
  isVisible: boolean;
}

export default function PreviewFrame({ exampleId, exampleCode, libraryCode, isVisible }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ libraryCode: string; exampleCode: string } | null>(null);

  function sendRunCode(lc: string, ec: string) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "RUN_CODE", exampleId, libraryCode: lc, exampleCode: ec },
      "*"
    );
  }

  // When iframe loads, mark ready and send any pending run
  function handleLoad() {
    readyRef.current = true;
    if (pendingRef.current) {
      sendRunCode(pendingRef.current.libraryCode, pendingRef.current.exampleCode);
      pendingRef.current = null;
    }
  }

  // Re-run whenever libraryCode or exampleCode changes (and we have a library)
  useEffect(() => {
    if (!libraryCode.trim()) return;
    if (readyRef.current) {
      sendRunCode(libraryCode, exampleCode);
    } else {
      pendingRef.current = { libraryCode, exampleCode };
    }
  }, [libraryCode, exampleCode]);

  return (
    <iframe
      ref={iframeRef}
      src="/sandbox.html"
      sandbox="allow-scripts allow-same-origin"
      onLoad={handleLoad}
      style={{ display: isVisible ? "block" : "none" }}
      className="w-full h-full border-0 bg-white"
      title={`Preview: ${exampleId}`}
    />
  );
}
