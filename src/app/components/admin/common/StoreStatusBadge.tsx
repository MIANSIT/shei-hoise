"use client";

import React from "react";
import { StoreStatus } from "@/lib/types/enums";

interface StoreStatusBadgeProps {
  status: string | null; // accept string from DB
  isActive: boolean | null;
}

const STORE_STATUS_CONFIG: Record<
  StoreStatus,
  {
    label: string;
    className: string;
  }
> = {
  [StoreStatus.PENDING]: {
    label: "PENDING",
    className: "bg-yellow-100 text-yellow-800",
  },
  [StoreStatus.APPROVED]: {
    label: "APPROVED",
    className: "bg-green-100 text-green-800",
  },
  [StoreStatus.REJECTED]: {
    label: "REJECTED",
    className: "bg-red-100 text-red-800",
  },
  [StoreStatus.TRAIL]: {
    label: "TRIAL",
    className: "bg-blue-100 text-blue-800",
  },
};

export function StoreStatusBadge({ status, isActive }: StoreStatusBadgeProps) {
  if (!status) return null;

  // convert string to enum safely
  const statusEnum: StoreStatus | undefined = Object.values(
    StoreStatus
  ).includes(status as StoreStatus)
    ? (status as StoreStatus)
    : undefined;

  if (!statusEnum) return null;

  const config = STORE_STATUS_CONFIG[statusEnum];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${config.className}`}
      >
        {config.label}
      </span>

      {isActive === false && (
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-600 text-white">
          INACTIVE
        </span>
      )}
    </div>
  );
}

export default StoreStatusBadge;
