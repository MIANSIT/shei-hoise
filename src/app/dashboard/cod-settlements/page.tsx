"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, InputNumber, Pagination, Select, Table, Popconfirm, Typography, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Truck, Trash2 } from "lucide-react";
import dayjs, { Dayjs } from "dayjs";

import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import { getUnsettledCodOrders, getCodSettlementsList } from "@/lib/queries/orders/codSettlements";
import { recordCodSettlement } from "@/lib/queries/orders/recordCodSettlement";
import { deleteCodSettlement } from "@/lib/queries/orders/deleteCodSettlement";
import type { DeliveryCourier } from "@/lib/types/store/store";
import type { CodSettlement, UnsettledCodOrder } from "@/lib/types/codSettlement";

const { Text, Title } = Typography;
const PAGE_SIZE = 10;

export default function CodSettlementsPage() {
  const { storeId, user } = useCurrentUser();
  const { success, error } = useSheiNotification();
  const { icon: currencyIcon } = useUserCurrencyIcon();
  const currencySymbol = typeof currencyIcon === "string" ? currencyIcon : "";
  const money = useCallback(
    (v: number) => `${currencySymbol ? `${currencySymbol} ` : ""}${Number(v).toFixed(2)}`,
    [currencySymbol],
  );

  const [couriers, setCouriers] = useState<DeliveryCourier[]>([]);
  const courierName = useCallback(
    (id: string | null) => (id ? (couriers.find((c) => c.id === id)?.name ?? id) : "—"),
    [couriers],
  );

  const [courierFilter, setCourierFilter] = useState<string | null>(null);
  const [unsettled, setUnsettled] = useState<UnsettledCodOrder[]>([]);
  const [unsettledLoading, setUnsettledLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [settlementDate, setSettlementDate] = useState<Dayjs>(dayjs());
  const [amountReceived, setAmountReceived] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [settlements, setSettlements] = useState<CodSettlement[]>([]);
  const [settlementsTotal, setSettlementsTotal] = useState(0);
  const [settlementsPage, setSettlementsPage] = useState(1);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    getDeliveryCouriers(storeId).then(setCouriers);
  }, [storeId]);

  const fetchUnsettled = useCallback(async () => {
    if (!storeId) return;
    setUnsettledLoading(true);
    try {
      const rows = await getUnsettledCodOrders(storeId, courierFilter);
      setUnsettled(rows);
      setSelectedIds([]);
    } finally {
      setUnsettledLoading(false);
    }
  }, [storeId, courierFilter]);

  const fetchSettlements = useCallback(async () => {
    if (!storeId) return;
    setSettlementsLoading(true);
    try {
      const result = await getCodSettlementsList(storeId, settlementsPage, PAGE_SIZE);
      setSettlements(result.data);
      setSettlementsTotal(result.total);
    } finally {
      setSettlementsLoading(false);
    }
  }, [storeId, settlementsPage]);

  useEffect(() => {
    fetchUnsettled();
  }, [fetchUnsettled]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const selectedTotal = useMemo(
    () =>
      unsettled
        .filter((o) => selectedIds.includes(o.id))
        .reduce((sum, o) => sum + o.expected_from_courier, 0),
    [unsettled, selectedIds],
  );

  const handleSelectionChange = (ids: React.Key[]) => {
    setSelectedIds(ids as string[]);
    const total = unsettled
      .filter((o) => ids.includes(o.id))
      .reduce((sum, o) => sum + o.expected_from_courier, 0);
    setAmountReceived(total > 0 ? total : null);
  };

  const handleRecordSettlement = async () => {
    if (!selectedIds.length) {
      error("Select at least one delivered order");
      return;
    }
    if (!amountReceived || amountReceived <= 0) {
      error("Enter the amount the courier actually paid out");
      return;
    }
    setSubmitting(true);
    try {
      await recordCodSettlement({
        settlementDate: settlementDate.format("YYYY-MM-DD"),
        courier: courierFilter,
        totalAmount: amountReceived,
        orderIds: selectedIds,
        note: note || null,
      });
      success("Settlement recorded — cash added to that date's Register Audit");
      setNote("");
      setAmountReceived(null);
      fetchUnsettled();
      fetchSettlements();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (settlementId: string) => {
    setDeletingId(settlementId);
    try {
      await deleteCodSettlement(settlementId);
      success("Settlement deleted — its orders are unsettled again. Their payment status was not changed; set it back to pending on any order that wasn't actually paid.");
      fetchUnsettled();
      fetchSettlements();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete settlement");
    } finally {
      setDeletingId(null);
    }
  };

  const unsettledColumns: ColumnsType<UnsettledCodOrder> = [
    {
      title: "Order #",
      dataIndex: "order_number",
      key: "order_number",
      render: (v: string) => <span className="font-medium">#{v}</span>,
    },
    { title: "Customer", dataIndex: "customer_name", key: "customer_name" },
    {
      title: "Delivered/Order Date",
      dataIndex: "order_date",
      key: "order_date",
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    { title: "Courier", key: "courier", render: (_, row) => courierName(row.courier) },
    {
      title: "Due from Courier",
      key: "expected_from_courier",
      align: "right" as const,
      render: (_, row) => (
        <div>
          <div className="font-medium">{money(row.expected_from_courier)}</div>
          {(row.courier_deduction > 0.005 || row.due_remaining < row.total_amount - 0.005) && (
            <div className="text-xs text-muted-foreground">
              {money(row.due_remaining)} collected
              {row.courier_deduction > 0.005 && ` − ${money(row.courier_deduction)} courier charge`}
              {row.due_remaining < row.total_amount - 0.005 && " (rest already paid)"}
            </div>
          )}
        </div>
      ),
    },
  ];

  const settlementColumns: ColumnsType<CodSettlement> = [
    {
      title: "Settled On",
      dataIndex: "settlement_date",
      key: "settlement_date",
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    { title: "Courier", key: "courier", render: (_, row) => courierName(row.courier) },
    { title: "Orders", dataIndex: "order_count", key: "order_count", align: "right" as const },
    {
      title: "Amount Received",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right" as const,
      render: (v: number) => money(v),
    },
    { title: "Note", dataIndex: "note", key: "note", render: (v: string | null) => v || "—" },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Delete this settlement? Its orders become unsettled again."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<Trash2 size={14} />}
            loading={deletingId === record.id}
          />
        </Popconfirm>
      ),
    },
  ];

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Truck size={20} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground m-0">COD Settlements</h1>
            <p className="text-xs text-muted-foreground m-0">
              Record the cash a courier hands over for delivered COD orders — it&apos;s added to
              that date&apos;s Register Audit cash.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text strong className="text-sm">
              Delivered, unsettled COD orders
            </Text>
            <Select
              allowClear
              placeholder="All couriers"
              value={courierFilter ?? undefined}
              onChange={(v) => setCourierFilter(v ?? null)}
              options={couriers.map((c) => ({ value: c.id, label: c.name }))}
              className="w-full sm:w-56"
            />
          </div>

          <Table
            columns={unsettledColumns}
            dataSource={unsettled}
            rowKey="id"
            loading={unsettledLoading}
            pagination={false}
            size="small"
            scroll={{ x: 650, y: 320 }}
            locale={{ emptyText: "No unsettled delivered COD orders" }}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: handleSelectionChange,
            }}
          />

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-border/60">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Selected total</div>
                <div className="text-sm font-semibold">{money(selectedTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Settlement date</div>
                <DatePicker
                  value={settlementDate}
                  onChange={(d) => d && setSettlementDate(d)}
                  allowClear={false}
                  disabledDate={(d) => d.isAfter(dayjs(), "day")}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Amount actually received</div>
                <InputNumber
                  min={0}
                  value={amountReceived}
                  onChange={(v) => setAmountReceived(v)}
                  style={{ width: 160 }}
                  placeholder="0.00"
                />
              </div>
              <div className="grow min-w-40">
                <div className="text-xs text-muted-foreground mb-1">Note (optional)</div>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Steadfast payout ref #..."
                />
              </div>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleRecordSettlement}
                className="rounded-xl h-9 font-semibold border-none"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                  boxShadow: "0 4px 14px rgba(234,88,12,0.35)",
                }}
              >
                Record Settlement
              </Button>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
          <Title level={5} style={{ margin: 0 }}>
            Settlement History
          </Title>
          <Table
            columns={settlementColumns}
            dataSource={settlements}
            rowKey="id"
            loading={settlementsLoading}
            pagination={false}
            size="small"
            scroll={{ x: 650 }}
            locale={{ emptyText: "No settlements recorded yet" }}
          />
          {settlementsTotal > PAGE_SIZE && (
            <div className="flex justify-end">
              <Pagination
                current={settlementsPage}
                pageSize={PAGE_SIZE}
                total={settlementsTotal}
                onChange={setSettlementsPage}
                showSizeChanger={false}
                size="small"
                showTotal={(t) => `${t} settlements`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
