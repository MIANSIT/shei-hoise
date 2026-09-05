"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Space } from "antd";
import { PrinterOutlined, ShareAltOutlined, FilePdfOutlined } from "@ant-design/icons";

interface ReceiptPreviewModalProps {
  open: boolean;
  pdfBlob: Blob | null;
  fileName: string;
  onClose: () => void;
}

/**
 * Shows the generated receipt PDF via an <iframe> on its blob: URL
 * (same-origin so contentWindow access/printing isn't blocked), with
 * explicit Print and Share actions — instead of navigating to a new tab or
 * auto-picking a path by device type.
 *
 * The iframe renders the PDF inline fine on desktop, so it stays visible
 * there. Mobile Chrome/Safari don't reliably render a blob: PDF inside an
 * iframe at all (it shows a bare "open this file" placeholder instead of
 * the actual content) — rather than fight that, mobile gets a simple
 * "ready to print" card instead, while the same iframe stays mounted
 * off-screen purely so Print can still call .print() on it. The real visual
 * check on mobile happens in the OS's own print preview once Print is
 * tapped, which — unlike the iframe — renders the PDF correctly.
 */
export default function ReceiptPreviewModal({
  open,
  pdfBlob,
  fileName,
  onClose,
}: ReceiptPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPad|iPhone|iPod|Android/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open || !pdfBlob) {
      setBlobUrl(null);
      setCanShare(false);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);
    // Feature-detected against the actual file being offered, not a dummy —
    // some browsers' canShare answer depends on the file's type/size.
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    setCanShare(typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] }));
    return () => URL.revokeObjectURL(url);
  }, [open, pdfBlob, fileName]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else if (blobUrl) {
      // Only reached if the iframe somehow never mounted a window — same
      // blob URL, just as a last resort.
      window.open(blobUrl, "_blank");
    }
  };

  const handleShare = async () => {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    try {
      await navigator.share({ files: [file], title: fileName });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Failed to share receipt PDF:", err);
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Receipt"
      centered
      width={420}
      footer={
        <Space style={{ width: "100%", justifyContent: "center" }}>
          <Button icon={<PrinterOutlined />} type="primary" size="large" onClick={handlePrint}>
            Print
          </Button>
          {canShare && (
            <Button icon={<ShareAltOutlined />} size="large" onClick={handleShare}>
              Share
            </Button>
          )}
        </Space>
      }
    >
      {blobUrl && isMobile && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "40px 16px",
            color: "#666",
          }}
        >
          <FilePdfOutlined style={{ fontSize: 48, color: "#d4380d" }} />
          <div style={{ fontWeight: 600, color: "#333" }}>Receipt ready</div>
          <div style={{ fontSize: 12, textAlign: "center", wordBreak: "break-all" }}>{fileName}</div>
        </div>
      )}
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          title="Receipt preview"
          style={
            isMobile
              ? // Same hidden-iframe CSS already proven for print() elsewhere
                // in this app (see printHtmlDocument in printWindow.ts) —
                // `visibility: hidden` still lets the browser fully load and
                // lay out the iframe's content, unlike a 1px/opacity:0 box,
                // which risked the embedded PDF viewer never properly
                // initializing and print() then doing nothing.
                { position: "fixed", width: 0, height: 0, border: 0, visibility: "hidden" }
              : { width: "100%", height: "60vh", border: "none", background: "#f5f5f5" }
          }
        />
      )}
    </Modal>
  );
}
