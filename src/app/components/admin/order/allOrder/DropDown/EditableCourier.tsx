"use client";

import React, { memo, useEffect, useState } from "react";
import { Select } from "antd";
import Link from "next/link";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import { getStoreSubscription } from "@/lib/queries/subscription/getStoreSubscription";
import { hasFeature } from "@/lib/utils/planFeatures";
import { useTranslation } from "@/lib/hook/useTranslation";
import type { DeliveryCourier } from "@/lib/types/store/store";

interface Props {
  courier: string;
  storeId: string;
  onSave: (newCourier: string) => void;
  disabled?: boolean;
}

const CourierSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ value, options, onChange, disabled }) => {
  return (
    <Select
      value={value || undefined}
      allowClear
      style={{ width: 160 }}
      onChange={(v) => onChange(v ?? "")}
      options={options}
      disabled={disabled}
    />
  );
};

const MemoizedCourierSelect = memo(CourierSelect);

const EditableCourier: React.FC<Props> = ({ courier, storeId, onSave, disabled }) => {
  const t = useTranslation();
  const [couriers, setCouriers] = useState<DeliveryCourier[]>([]);
  const [courierTrackingAllowed, setCourierTrackingAllowed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    getDeliveryCouriers(storeId).then(setCouriers);
    getStoreSubscription(storeId).then((sub) =>
      setCourierTrackingAllowed(hasFeature(sub, "courier_tracking")),
    );
  }, [storeId]);

  // Pathao/Steadfast only stay selectable if the plan includes courier
  // tracking — except the order's current value, which always stays visible
  // even if it's Pathao/Steadfast and the plan has since lost that feature,
  // so the field never shows a value with no matching option.
  const options = couriers
    .filter((c) => c.type === "manual" || courierTrackingAllowed || c.type === courier)
    .map((c) => ({
      value: c.type === "manual" ? c.name : c.type,
      label: c.name,
    }));

  if (options.length === 0) {
    return (
      <Link
        href="/dashboard/courier/manage"
        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
      >
        {t.admin.orderSummaryAddCourierCta}
      </Link>
    );
  }

  return (
    <MemoizedCourierSelect
      value={courier}
      options={options}
      onChange={onSave}
      disabled={disabled}
    />
  );
};

export default EditableCourier;
