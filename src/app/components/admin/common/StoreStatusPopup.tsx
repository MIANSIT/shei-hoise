"use client";

import React, { useEffect, useState } from "react";
import { StoreStatus } from "@/lib/types/enums";

interface StoreStatusPopupProps {
  status: string | null;
  isActive: boolean | null;
  createdAt: string; // ISO date from DB
}

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  [StoreStatus.PENDING]: "PENDING",
  [StoreStatus.APPROVED]: "APPROVED",
  [StoreStatus.REJECTED]: "REJECTED",
  [StoreStatus.TRIAL]: "TRIAL",
};

export function StoreStatusPopup({
  status,
  isActive,
  createdAt,
}: StoreStatusPopupProps) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  const SEVEN_DAYS = 7 * 24 * 60 * 60; // seconds

  // Convert string from DB to enum
  const statusEnum: StoreStatus | undefined = status
    ? Object.values(StoreStatus).includes(status.toLowerCase() as StoreStatus)
      ? (status.toLowerCase() as StoreStatus)
      : undefined
    : undefined;

  // Show popup and set countdown
  useEffect(() => {
    if (!statusEnum || !createdAt) return;

    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const secondsElapsed = Math.floor((now - createdTime) / 1000);
    const remaining = SEVEN_DAYS - secondsElapsed;

    if (remaining > 0) {
      setCountdown(remaining);
      setShow(true);
    }
  }, [statusEnum, createdAt]);

  // Countdown timer
  useEffect(() => {
    if (!show || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShow(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, countdown]);

  const handleClose = () => {
    setShow(false); // just hide in-memory, no localStorage
  };

  if (!show || !statusEnum) return null;

  const formatTime = (secs: number) => {
    const d = Math.floor(secs / (24 * 3600));
    const h = Math.floor((secs % (24 * 3600)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-300 dark:border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold">
            Store Status: {STORE_STATUS_LABELS[statusEnum]}
          </h3>
          {!isActive && <p className="text-xs text-red-600">INACTIVE</p>}
          <p className="text-xs mt-1">Expires in: {formatTime(countdown)}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}
