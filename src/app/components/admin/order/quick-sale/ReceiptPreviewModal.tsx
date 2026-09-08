"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Space } from "antd";
import { PrinterOutlined, ShareAltOutlined, FilePdfOutlined } from "@ant-design/icons";
import { printPdfBlob } from "@/lib/utils/printWindow";

interface ReceiptPreviewModalProps {
  open: boolean;
  /** Both copies as one 2-page PDF — shown in the preview and used for Share. */
  pdfBlob: Blob | null;
  /** Single-page PDFs, printed as independent jobs (see generateReceiptPdf.ts's ReceiptPdfSet for why). */
  customerCopyBlob: Blob | null;
  shopCopyBlob: Blob | null;
  fileName: string;
  onClose: () => void;
}

/**
 * Shows the generated receipt PDF via an <iframe> on its blob: URL, plus
 * separate "Print Customer Copy" / "Print Shop Copy" actions — kept as two
 * independent one-page print jobs (rather than one Print button sending the
 * whole 2-page PDF) because a cheap thermal print bridge often only honors
 * page 1 of a multi-page PDF, and the OS print sheet closing after that
 * first job left no way back to the second page. Both buttons stay visible
 * here for as long as the modal is open, so printing "page 2" is just
 * tapping the other button — no popup sequencing, no relying on detecting
 * when a print actually finished (browsers don't reliably expose that).
 *
 * The iframe renders the PDF inline fine on desktop, so it stays visible
 * there. Mobile Chrome/Safari don't reliably render a blob: PDF inside an
 * iframe at all (it shows a bare "open this file" placeholder instead of
 * the actual content) — rather than fight that, mobile gets a simple
 * "ready to print" card instead; the actual print/preview happens in the
 * browser's own PDF viewer once one of the print buttons is tapped (see
 * printPdfBlob in printWindow.ts).
 */
export default function ReceiptPreviewModal({
  open,
  pdfBlob,
  customerCopyBlob,
  shopCopyBlob,
  fileName,
  onClose,
}: ReceiptPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const fileNameFor = (copy: "customer" | "shop") => fileName.replace(/\.pdf$/i, `-${copy}.pdf`);

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
        <Space wrap style={{ width: "100%", justifyContent: "center" }}>
          <Button
            icon={<PrinterOutlined />}
            type="primary"
            size="large"
            disabled={!customerCopyBlob}
            onClick={() =>
              customerCopyBlob && printPdfBlob(customerCopyBlob, fileNameFor("customer"))
            }
          >
            Print Customer Copy
          </Button>
          <Button
            icon={<PrinterOutlined />}
            size="large"
            disabled={!shopCopyBlob}
            onClick={() => shopCopyBlob && printPdfBlob(shopCopyBlob, fileNameFor("shop"))}
          >
            Print Shop Copy
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
      {blobUrl && !isMobile && (
        <iframe
          src={blobUrl}
          title="Receipt preview"
          style={{ width: "100%", height: "60vh", border: "none", background: "#f5f5f5" }}
        />
      )}
    </Modal>
  );
}
