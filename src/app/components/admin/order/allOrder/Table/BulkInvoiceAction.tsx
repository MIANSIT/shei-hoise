"use client";

import React, { useState } from "react";
import { Button, Modal, Popover, App } from "antd";
import { FileDown, Loader2 } from "lucide-react";
import { StoreOrder } from "@/lib/types/order";
import { useInvoiceData } from "@/lib/hook/useInvoiceData";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import ExportUpsell from "@/app/components/admin/common/ExportUpsell";
import { buildInvoiceRequestData } from "@/lib/utils/buildInvoiceRequestData";
import { LockOutlined } from "@ant-design/icons";

type BulkLayout = "1up" | "3up" | "10up";

interface Props {
  selectedOrders: StoreOrder[];
  storeId?: string;
  paidAmountByOrderId: Record<string, number>;
  getCustomerName: (order: StoreOrder) => string;
  getCustomerPhone: (order: StoreOrder) => string;
  getFullAddress: (order: StoreOrder) => string;
  exportAllowed: boolean;
  onClearSelection: () => void;
}

const LAYOUT_OPTIONS: {
  key: BulkLayout;
  title: string;
  description: string;
  preview: React.ReactNode;
}[] = [
  {
    key: "1up",
    title: "1 per page",
    description: "Full detail invoice, one order per A4 page — best for small batches.",
    preview: (
      <div className="w-14 h-18 rounded border border-border bg-muted/60 flex items-center justify-center">
        <div className="w-10 h-14 rounded-sm bg-card border border-border" />
      </div>
    ),
  },
  {
    key: "3up",
    title: "3 per page",
    description: "Compact strips stacked on one page — good for a daily batch.",
    preview: (
      <div className="w-14 h-18 rounded border border-border bg-muted/60 flex flex-col items-center justify-center gap-1 p-1">
        <div className="w-full h-4 rounded-sm bg-card border border-border" />
        <div className="w-full h-4 rounded-sm bg-card border border-border" />
        <div className="w-full h-4 rounded-sm bg-card border border-border" />
      </div>
    ),
  },
  {
    key: "10up",
    title: "10 per page",
    description: "Mini slips, 2×5 grid — highest density for large batch printing.",
    preview: (
      <div className="w-14 h-18 rounded border border-border bg-muted/60 grid grid-cols-2 grid-rows-5 gap-0.5 p-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-sm bg-card border border-border" />
        ))}
      </div>
    ),
  },
];

const BulkInvoiceAction: React.FC<Props> = ({
  selectedOrders,
  storeId,
  paidAmountByOrderId,
  getCustomerName,
  getCustomerPhone,
  getFullAddress,
  exportAllowed,
  onClearSelection,
}) => {
  const { notification } = App.useApp();
  const n = useLocalNum();
  const { storeData } = useInvoiceData({ storeId });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [layout, setLayout] = useState<BulkLayout>("1up");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!storeData) {
      notification.error({
        title: "Store info not loaded",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    setDownloading(true);
    try {
      const invoices = selectedOrders.map((order) =>
        buildInvoiceRequestData(
          order,
          getCustomerName(order),
          getCustomerPhone(order),
          getFullAddress(order),
          paidAmountByOrderId[order.id],
        ),
      );

      const res = await fetch("/api/invoices/generate-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/pdf" },
        body: JSON.stringify({
          store: {
            name: storeData.store_name,
            address: storeData.business_address,
            phone: storeData.contact_phone,
            email: storeData.contact_email,
          },
          layout,
          invoices,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate bulk invoice PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices_${selectedOrders.length}_${layout}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      notification.success({
        title: "Invoices downloaded",
        description: `${n(selectedOrders.length)} invoice(s) exported as PDF.`,
      });
      setIsModalOpen(false);
      onClearSelection();
    } catch (error) {
      console.error("Bulk invoice download error:", error);
      notification.error({
        title: "Download failed",
        description: "Could not generate the invoice PDF. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const trigger = (
    <Button
      icon={<FileDown size={16} />}
      disabled={selectedOrders.length === 0 || !exportAllowed}
      onClick={() => exportAllowed && setIsModalOpen(true)}
      className="w-full sm:w-auto"
    >
      Download Invoices ({n(selectedOrders.length)})
    </Button>
  );

  return (
    <>
      {exportAllowed ? (
        trigger
      ) : (
        <Popover
          content={<ExportUpsell />}
          trigger="click"
          placement="bottomRight"
          styles={{ container: { padding: 12, borderRadius: 14 } }}
        >
          <Button icon={<LockOutlined />} className="text-muted-foreground w-full sm:w-auto">
            Download Invoices
          </Button>
        </Popover>
      )}

      <Modal
        title={
          <div className="text-base sm:text-lg font-semibold">
            Download {n(selectedOrders.length)} Invoice(s)
          </div>
        }
        open={isModalOpen}
        onCancel={() => !downloading && setIsModalOpen(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: "560px" }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose how many invoices to fit on each A4 page.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setLayout(option.key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-colors ${
                  layout === option.key
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-border hover:border-indigo-300"
                }`}
              >
                {option.preview}
                <div className="text-sm font-semibold text-foreground">{option.title}</div>
                <div className="text-xs text-muted-foreground leading-snug">
                  {option.description}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border sm:justify-end">
            <Button onClick={() => setIsModalOpen(false)} disabled={downloading} className="sm:w-auto">
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleDownload}
              disabled={downloading || !storeData}
              className="sm:w-auto"
            >
              {downloading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Generating…
                </span>
              ) : (
                "Download PDF"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkInvoiceAction;
