"use client";

import { Viewer, Worker } from "@react-pdf-viewer/core";
import React from "react";

export type PdfViewerProps = {
  fileUrl: string;
  height?: number | string;
  className?: string;
};

/**
 * Minimal single-pane PDF viewer that works across desktop and mobile.
 * It purposely avoids the default layout plugin to keep UI simple (no side panels or toolbars).
 */
export function PdfViewer({ fileUrl, height = "75vh", className }: PdfViewerProps) {
  return (
    <Worker workerUrl="/pdf.worker.min.js">
      <div data-testid="pdf-viewer" className={className} style={{ height }}>
        <Viewer fileUrl={fileUrl} />
      </div>
    </Worker>
  );
}
