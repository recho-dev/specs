"use client";

import { useRef, useEffect } from "react";

interface Props {
  exampleId: string;
  exampleCode: string;
  libraryCode: string;
  packageJson: string;
  isVisible: boolean;
}

export default function PreviewFrame({ exampleId, exampleCode, libraryCode, packageJson, isVisible }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{ libraryCode: string; exampleCode: string; packageJson: string } | null>(null);

  function sendRunCode(lc: string, ec: string, pj: string) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "RUN_CODE", exampleId, libraryCode: lc, exampleCode: ec, packageJson: pj },
      "*"
    );
  }

  // When iframe loads, mark ready and send any pending run
  function handleLoad() {
    readyRef.current = true;
    if (pendingRef.current) {
      sendRunCode(pendingRef.current.libraryCode, pendingRef.current.exampleCode, pendingRef.current.packageJson);
      pendingRef.current = null;
    }
  }

  // Re-run whenever libraryCode, exampleCode, or packageJson changes (and we have a library)
  useEffect(() => {
    if (!libraryCode.trim()) return;
    if (readyRef.current) {
      sendRunCode(libraryCode, exampleCode, packageJson);
    } else {
      pendingRef.current = { libraryCode, exampleCode, packageJson };
    }
  }, [libraryCode, exampleCode, packageJson]);

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
