"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Space } from "antd";
import { PrinterOutlined, DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import { downloadBlob, printPdfBlob } from "@/lib/utils/printWindow";

interface QrLabelPreviewModalProps {
  open: boolean;
  pdfBlob: Blob | null;
  fileName: string;
  onClose: () => void;
}

/**
 * Shows a generated QR label PDF (single product or bulk, any layout) via an
 * <iframe> on its blob: URL before anything actually happens with it — same
 * "generate, preview in a modal, then Print/Download" pattern already used
 * for Quick Sale's checkout receipt (ReceiptPreviewModal.tsx). Clicking a
 * toolbar action used to jump straight to the browser's native print/save
 * dialog with no on-page feedback first, which read as an abrupt page
 * change; this puts one predictable, in-page step in front of that instead.
 *
 * Mobile Chrome/Safari don't reliably render a blob: PDF inside an iframe
 * (a bare "open this file" placeholder shows instead of the actual
 * content), so mobile gets a simple "ready" card — the real preview/print
 * happens in the browser's own PDF viewer once Print is tapped (see
 * printPdfBlob in printWindow.ts).
 */
export default function QrLabelPreviewModal({
  open,
  pdfBlob,
  fileName,
  onClose,
}: QrLabelPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setIsMobile(/iPad|iPhone|iPod|Android/.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open || !pdfBlob) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, pdfBlob]);

  const handlePrint = async () => {
    if (!pdfBlob) return;
    setPrinting(true);
    try {
      // preferShare: false — a label goes to a regular/photo printer, not
      // an ESC/POS Bluetooth bridge, so skip the mobile Share-sheet detour
      // printPdfBlob otherwise takes for receipts.
      await printPdfBlob(pdfBlob, fileName, { preferShare: false });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="QR Labels"
      centered
      width={420}
      footer={
        <Space wrap style={{ width: "100%", justifyContent: "center" }}>
          <Button
            icon={<DownloadOutlined />}
            size="large"
            disabled={!pdfBlob}
            onClick={() => pdfBlob && downloadBlob(pdfBlob, fileName)}
          >
            Download
          </Button>
          <Button
            icon={<PrinterOutlined />}
            type="primary"
            size="large"
            loading={printing}
            disabled={!pdfBlob}
            onClick={handlePrint}
          >
            Print
          </Button>
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
          <div style={{ fontWeight: 600, color: "#333" }}>Labels ready</div>
          <div style={{ fontSize: 12, textAlign: "center", wordBreak: "break-all" }}>{fileName}</div>
        </div>
      )}
      {blobUrl && !isMobile && (
        <iframe
          src={blobUrl}
          title="QR labels preview"
          style={{ width: "100%", height: "60vh", border: "none", background: "#f5f5f5" }}
        />
      )}
    </Modal>
  );
}
