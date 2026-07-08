"use client";

import React, { useState } from "react";
import { Popover } from "antd";
import { HistoryOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getStockMovements,
  type StockMovement,
} from "@/lib/queries/inventory/getStockMovements";

interface StockHistoryPopoverProps {
  productId: string;
  variantId: string | null;
}

const REASON_LABELS: Record<string, string> = {
  manual_adjustment: "Manual adjustment",
  bulk_adjustment: "Bulk adjustment",
  bulk_set_zero: "Bulk set to 0",
  recount: "Recount",
};

const StockHistoryPopover: React.FC<StockHistoryPopoverProps> = ({
  productId,
  variantId,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      try {
        const data = await getStockMovements(productId, variantId, 5);
        setMovements(data);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      styles={{ container: { padding: 10, borderRadius: 12, width: 250 } }}
      content={
        <div onClick={(e) => e.stopPropagation()}>
          <p className="m-0 mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Recent activity
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <LoadingOutlined />
            </div>
          ) : movements.length === 0 ? (
            <p className="m-0 py-2 text-[11.5px] text-gray-400 dark:text-gray-500">
              No changes recorded yet.
            </p>
          ) : (
            <div className="flex flex-col">
              {movements.map((m, i) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-2 py-1.5 text-[11.5px] ${
                    i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-400 truncate">
                    {m.createdByName ?? REASON_LABELS[m.reason] ?? m.reason} ·{" "}
                    {dayjs(m.createdAt).format("MMM D, h:mm A")}
                  </span>
                  <span
                    className={`shrink-0 font-bold ${
                      m.delta > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : m.delta < 0
                          ? "text-red-500 dark:text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      }
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        aria-label="Stock history"
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-gray-500 transition-colors"
      >
        <HistoryOutlined style={{ fontSize: 12 }} />
      </button>
    </Popover>
  );
};

export default StockHistoryPopover;
