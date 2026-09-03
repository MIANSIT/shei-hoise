"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Space } from "antd";
import { PrinterOutlined, ShareAltOutlined } from "@ant-design/icons";

interface ReceiptPreviewModalProps {
  open: boolean;
  pdfBlob: Blob | null;
  fileName: string;
  onClose: () => void;
}

/**
 * Shows the generated receipt PDF inline (an <iframe> on its blob: URL,
 * same-origin so contentWindow access/printing isn't blocked) instead of
 * navigating to a new tab or auto-picking a share/open path by device type.
 * A cashier explicitly chooses Print (goes straight to the OS print dialog
 * on the embedded PDF — its 58mm page size is baked into the file, so this
 * doesn't detour through a generic "Save as PDF" step the way opening the
 * PDF as a plain link tends to on mobile) or Share (hands the same file to
 * another printer app, e.g. RawBT on Android).
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
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          title="Receipt preview"
          style={{ width: "100%", height: "60vh", border: "none", background: "#f5f5f5" }}
        />
      )}
    </Modal>
  );
}
