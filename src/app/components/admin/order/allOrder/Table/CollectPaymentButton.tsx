"use client";

import { useState } from "react";
import { Button } from "antd";
import { Wallet } from "lucide-react";
import { StoreOrder } from "@/lib/types/order";
import { PaymentStatus, PaymentMethod } from "@/lib/types/enums";
import { getCustomerOrderBalances } from "@/lib/queries/customers/getCustomerOrderBalances";
import { recordCustomerPayment } from "@/lib/queries/customers/recordCustomerPayment";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import CustomerQuickPaymentModal from "@/app/components/admin/dashboard/customers/dues/CustomerQuickPaymentModal";

interface Props {
  order: StoreOrder;
  onCollected?: () => void;
}

// Covers any not-yet-fully-paid order with a linked customer — not just
// ones explicitly created as "Due" (e.g. a plain pending COD order, once
// the courier actually hands over the cash) — reusing the same ledger
// (customer_payments) and modal already built for Quick Sale/Customer
// Dues. Hidden with no linked customer since customer_payments.customer_id
// is NOT NULL — there's nowhere to attribute the payment.
export default function CollectPaymentButton({ order, onCollected }: Props) {
  const notify = useSheiNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDue, setLoadingDue] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (order.payment_status === PaymentStatus.PAID || !order.customer_id) return null;

  const openModal = async () => {
    setLoadingDue(true);
    try {
      const balances = await getCustomerOrderBalances(order.store_id, order.customer_id as string);
      const thisOrder = balances.find((b) => b.order_id === order.id);
      setTotalDue(thisOrder?.due_remaining ?? Number(order.total_amount));
      setModalOpen(true);
    } finally {
      setLoadingDue(false);
    }
  };

  const handleSubmit = async (payload: {
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    orderId?: string | null;
  }) => {
    if (!order.customer_id) return;
    setSubmitting(true);
    try {
      // Always pinned to this exact order — orderOptions=[] on the modal
      // below means it never surfaces its own (unused) orderId picker.
      const result = await recordCustomerPayment({
        storeId: order.store_id,
        customerId: order.customer_id,
        orderId: order.id,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentDate: payload.paymentDate,
        notes: payload.notes,
      });
      if (result.success) {
        notify.success("Payment recorded");
        setModalOpen(false);
        onCollected?.();
      } else {
        notify.error(result.error || "Failed to record payment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        icon={<Wallet size={14} />}
        loading={loadingDue}
        onClick={openModal}
        className="text-sky-600! border-sky-600!"
      >
        Collect Payment
      </Button>
      <CustomerQuickPaymentModal
        open={modalOpen}
        submitting={submitting}
        customerName={order.customers?.first_name || order.shipping_address?.customer_name}
        totalDue={totalDue}
        orderOptions={[]}
        onSubmit={handleSubmit}
        onCancel={() => {
          if (!submitting) setModalOpen(false);
        }}
      />
    </>
  );
}
