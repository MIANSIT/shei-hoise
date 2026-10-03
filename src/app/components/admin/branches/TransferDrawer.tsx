"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Drawer, Empty, Grid, Input, InputNumber, Select, Spin } from "antd";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useBranches } from "@/lib/context/BranchContext";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useLocalNum } from "@/lib/hook/useLocalNum";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { createTransfer, getBranchStockOptions } from "@/lib/queries/branches/transfers";
import type { BranchStockOption } from "@/lib/queries/branches/types";

interface TransferDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Line extends BranchStockOption {
  quantity: number;
}

const lineKey = (o: { productId: string; variantId: string | null }) => `${o.productId}:${o.variantId ?? ""}`;

/** New stock transfer: pick two branches, add products from the source branch's stock, save or send. */
export function TransferDrawer({ open, onClose, onCreated }: TransferDrawerProps) {
  const t = useTranslation();
  const n = useLocalNum();
  const notify = useSheiNotification();
  const screens = Grid.useBreakpoint();
  const { activeBranches, selectedBranchId } = useBranches();
  const { can } = usePermissions();

  const [fromId, setFromId] = useState<string | undefined>();
  const [toId, setToId] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<BranchStockOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    if (!open) return;
    const from = activeBranches.find((b) => b.id === selectedBranchId)?.id ?? activeBranches[0]?.id;
    setFromId(from);
    setToId(activeBranches.find((b) => b.id !== from)?.id);
    setNote("");
    setLines([]);
    setSearch("");
  }, [open, activeBranches, selectedBranchId]);

  // Source branch stock, searched after a short pause; only the newest answer is used.
  useEffect(() => {
    if (!open || !fromId) {
      setOptions([]);
      return;
    }
    const requestId = ++latest.current;
    setOptionsLoading(true);
    const timer = setTimeout(async () => {
      const result = await getBranchStockOptions(fromId, search);
      if (requestId !== latest.current) return;
      setOptions(result.ok ? result.options : []);
      setOptionsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, fromId, search]);

  const chosen = useMemo(() => new Set(lines.map(lineKey)), [lines]);

  const addLine = (option: BranchStockOption) =>
    setLines((prev) => (chosen.has(lineKey(option)) ? prev : [...prev, { ...option, quantity: 1 }]));

  const changeFrom = (id: string) => {
    setFromId(id);
    setLines([]); // stock levels belong to the old source branch
    if (id === toId) setToId(activeBranches.find((b) => b.id !== id)?.id);
  };

  const branchOptions = activeBranches.map((b) => ({ value: b.id, label: b.name }));
  const invalidLine = lines.some((l) => !l.quantity || l.quantity < 1 || l.quantity > l.available);
  const canSubmit = !!fromId && !!toId && fromId !== toId && lines.length > 0 && !invalidLine;

  const submit = async (sendNow: boolean) => {
    if (!canSubmit || !fromId || !toId) return;
    setSaving(sendNow ? "send" : "draft");
    const result = await createTransfer({
      fromBranchId: fromId,
      toBranchId: toId,
      note,
      sendNow,
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
    });
    setSaving(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(
      (sendNow ? t.branches.toastTransferSent : t.branches.toastTransferSaved).replace(
        "{number}",
        result.data.transferNumber,
      ),
    );
    onCreated();
    onClose();
  };

  const label = (o: BranchStockOption) => (o.variantName ? `${o.productName} — ${o.variantName}` : o.productName);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={screens.md ? 640 : "100%"}
      title={t.branches.newTransfer}
      destroyOnHidden
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>{t.branches.cancel}</Button>
          <Button disabled={!canSubmit} loading={saving === "draft"} onClick={() => submit(false)}>
            {t.branches.saveDraft}
          </Button>
          {can("transfers.send") && (
            <Button type="primary" disabled={!canSubmit} loading={saving === "send"} onClick={() => submit(true)}>
              {t.branches.sendNow}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block space-y-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{t.branches.fromBranch}</span>
            <Select className="w-full" value={fromId} onChange={changeFrom} options={branchOptions} />
          </label>
          <ArrowRight className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <label className="block space-y-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{t.branches.toBranch}</span>
            <Select
              className="w-full"
              value={toId}
              onChange={setToId}
              options={branchOptions.filter((o) => o.value !== fromId)}
            />
          </label>
        </div>

        {/* Chosen products */}
        <section className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-foreground">{t.branches.itemsHeading}</h3>
          {lines.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">{t.branches.itemsEmpty}</p>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-border rounded-xl border border-border">
              {lines.map((line) => {
                const over = line.quantity > line.available;
                return (
                  <li key={lineKey(line)} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{label(line)}</div>
                      <div className={`text-xs ${over ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {t.branches.availableInSource.replace("{count}", n(line.available))}
                      </div>
                    </div>
                    <InputNumber
                      min={1}
                      max={line.available}
                      value={line.quantity}
                      status={over ? "error" : undefined}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((l) => (lineKey(l) === lineKey(line) ? { ...l, quantity: Number(v) || 0 } : l)),
                        )
                      }
                      className="w-24"
                      aria-label={t.branches.quantity}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setLines((prev) => prev.filter((l) => lineKey(l) !== lineKey(line)))}
                      aria-label={t.branches.removeItem}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pick from the source branch's stock */}
        <section className="space-y-2">
          <h3 className="m-0 text-sm font-semibold text-foreground">{t.branches.addProducts}</h3>
          <Input.Search
            placeholder={t.branches.searchStock}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            {optionsLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : options.length === 0 ? (
              <Empty className="py-4" image={Empty.PRESENTED_IMAGE_SIMPLE} description={t.branches.noStockInBranch} />
            ) : (
              <ul className="m-0 p-0 list-none divide-y divide-border">
                {options.map((option) => {
                  const added = chosen.has(lineKey(option));
                  return (
                    <li key={lineKey(option)} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">{label(option)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.branches.availableInSource.replace("{count}", n(option.available))}
                        </div>
                      </div>
                      <Button size="small" icon={<Plus className="h-3.5 w-3.5" />} disabled={added} onClick={() => addLine(option)}>
                        {added ? t.branches.added : t.branches.add}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">{t.branches.note}</span>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={300}
          />
        </label>
      </div>
    </Drawer>
  );
}
