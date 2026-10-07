"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, Button, Spin, Empty, Input } from "antd";
import { Wallet } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { getCustomersWithDue, CustomerWithDue } from "@/lib/queries/customers/getCustomersWithDue";
import {
  getCustomerOrderBalances,
  CustomerOrderBalance,
} from "@/lib/queries/customers/getCustomerOrderBalances";
import { recordCustomerPayment } from "@/lib/queries/customers/recordCustomerPayment";
import { PaymentMethod } from "@/lib/types/enums";
import CustomerQuickPaymentModal from "./CustomerQuickPaymentModal";
import { MenuLabel } from "@/app/components/admin/common/MenuLabel";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";

import { formatDate, formatDateShort, formatTime } from "@/lib/utils/formatDate";
import Link from "next/link";
import { DueReminderButton } from "./DueReminderButton";
import { getLastDueReminders } from "@/lib/queries/customers/dueReminders";
import { dueReminderKey } from "@/lib/utils/dueReminderKey";
export default function CustomerDues() {
  const { user } = useCurrentUser();
  const { icon: currencyIconRaw } = useUserCurrencyIcon();
  const currencyIcon = typeof currencyIconRaw === "string" ? currencyIconRaw : "৳";
  const notify = useSheiNotification();
  const t = useTranslation();
  // Stores with branches: dues are per branch, and the list follows the header's branch.
  const { enabled: branchesOn, loading: branchesLoading, selectedBranchId, branchName } = useBranches();
  const listBranchId = branchesOn ? selectedBranchId : null;

  const [dues, setDues] = useState<CustomerWithDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // When each row was last sent a payment reminder (key: customer + branch).
  const [reminders, setReminders] = useState<Record<string, string>>({});

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDue | null>(null);
  const [orderOptions, setOrderOptions] = useState<CustomerOrderBalance[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDues = useCallback(async () => {
    if (!user?.store_id || branchesLoading) return;
    setLoading(true);
    try {
      const data = await getCustomersWithDue(user.store_id, listBranchId, branchesOn);
      setDues(data);
      getLastDueReminders(user.store_id, [...new Set(data.map((d) => d.customer_id))])
        .then(setReminders)
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, listBranchId, branchesOn, branchesLoading]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const openPaymentModal = async (customer: CustomerWithDue) => {
    if (!user?.store_id) return;
    setSelectedCustomer(customer);
    setModalOpen(true);
    const balances = await getCustomerOrderBalances(
      user.store_id,
      customer.customer_id,
      customer.branch_id,
      branchesOn,
      true,
    );
    setOrderOptions(balances.filter((b) => b.due_remaining > 0.01));
  };

  const handleSubmit = async (payload: {
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    orderId?: string | null;
  }) => {
    if (!user?.store_id || !selectedCustomer) return;
    setSubmitting(true);
    try {
      const result = await recordCustomerPayment({
        storeId: user.store_id,
        customerId: selectedCustomer.customer_id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentDate: payload.paymentDate,
        notes: payload.notes,
        orderId: payload.orderId,
        createdBy: user.id,
        // The money is collected for this row's branch.
        branchId: selectedCustomer.branch_id,
      });
      if (result.success) {
        notify.success("Payment recorded");
        setModalOpen(false);
        setSelectedCustomer(null);
        fetchDues();
      } else {
        notify.error(result.error || "Failed to record payment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDues = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dues;
    return dues.filter((customer) => {
      const name = (customer.name || "").toLowerCase();
      const phone = (customer.phone || "").toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [dues, search]);

  const columns = [
    {
      title: "Customer",
      key: "name",
      render: (_: unknown, record: CustomerWithDue) => (
        record.phone ? (
          <Link
            href={`/dashboard/orders?phone=${encodeURIComponent(record.phone)}&due=true`}
            title={t.admin.customerViewDueOrders}
            className="text-sm font-semibold text-foreground hover:text-blue-600 hover:underline"
          >
            {record.name || "Walk-in Customer"}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-foreground">{record.name || "Walk-in Customer"}</span>
        )
      ),
    },
    ...(branchesOn && !listBranchId
      ? [
          {
            title: t.branches.orderBranch,
            key: "branch",
            render: (_: unknown, record: CustomerWithDue) => (
              <span className="text-sm text-teal-700 dark:text-teal-300">{branchName(record.branch_id) || "—"}</span>
            ),
          },
        ]
      : []),
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => (
        <span className="text-sm text-muted-foreground">{phone || "—"}</span>
      ),
    },
    {
      title: "Due Since",
      dataIndex: "oldest_due_date",
      key: "oldest_due_date",
      render: (date: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(date)}
        </span>
      ),
    },
    {
      title: "Total Due",
      dataIndex: "total_due",
      key: "total_due",
      align: "right" as const,
      render: (due: number, record: CustomerWithDue) => (
        record.phone ? (
          <Link
            href={`/dashboard/orders?phone=${encodeURIComponent(record.phone)}&due=true`}
            title={t.admin.customerViewDueOrders}
            className="text-sm font-bold text-rose-600 hover:underline dark:text-rose-400"
          >
            {currencyIcon}
            {due.toFixed(2)}
          </Link>
        ) : (
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {currencyIcon}
            {due.toFixed(2)}
          </span>
        )
      ),
    },
    {
      title: t.admin.dueLastReminder,
      key: "last_reminder",
      render: (_: unknown, record: CustomerWithDue) => {
        const at = reminders[dueReminderKey(record.customer_id, record.branch_id)];
        if (!at) return <span className="text-sm text-muted-foreground">—</span>;
        const today = new Date(at).toDateString() === new Date().toDateString();
        return (
          <span
            className={`text-sm ${today ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
          >
            {today ? `${t.admin.dueRemindedToday}, ${formatTime(at)}` : formatDateShort(at)}
          </span>
        );
      },
    },
    {
      title: "",
      key: "actions",
      align: "right" as const,
      render: (_: unknown, record: CustomerWithDue) => (
        <div className="flex items-center justify-end gap-2">
          {user?.store_id && (
            <DueReminderButton
              storeId={user.store_id}
              customerId={record.customer_id}
              branchId={record.branch_id}
              lastRemindedAt={reminders[dueReminderKey(record.customer_id, record.branch_id)] ?? null}
              onReminded={(at) =>
                setReminders((prev) => ({ ...prev, [dueReminderKey(record.customer_id, record.branch_id)]: at }))
              }
              customerName={record.name}
              phone={record.phone}
              amount={record.total_due}
              currency={currencyIcon}
              dueSince={record.oldest_due_date}
            />
          )}
          <Button size="small" type="primary" onClick={() => openPaymentModal(record)}>
            Collect Payment
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0">
            <Wallet size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
              <MenuLabel labelKey="menuCustomerDues" />
            </h1>
            <p className="text-xs text-muted-foreground m-0">
              Walk-in customers with an outstanding balance from Quick Sale
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        <div className="mb-4 max-w-sm">
          <Input.Search
            allowClear
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : dues.length === 0 ? (
          <Empty description="No outstanding customer dues right now" />
        ) : filteredDues.length === 0 ? (
          <Empty description="No customers match your search" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredDues}
            rowKey="row_key"
            scroll={{ x: "max-content" }}
            pagination={false}
          />
        )}
      </div>

      <CustomerQuickPaymentModal
        open={modalOpen}
        submitting={submitting}
        customerName={selectedCustomer?.name || "Walk-in Customer"}
        totalDue={selectedCustomer?.total_due ?? 0}
        orderOptions={orderOptions.map((b) => ({
          order_id: b.order_id,
          order_number: b.order_number,
          due_remaining: b.due_remaining,
        }))}
        onSubmit={handleSubmit}
        onCancel={() => {
          if (!submitting) {
            setModalOpen(false);
            setSelectedCustomer(null);
          }
        }}
      />
    </div>
  );
}
