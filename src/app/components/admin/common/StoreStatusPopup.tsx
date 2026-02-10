"use client";

import React, { useEffect, useState } from "react";
import { StoreStatus } from "@/lib/types/enums";
import { AlertCircle, X, Clock, XCircle, CreditCard } from "lucide-react";
import Link from "next/link";

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
  // isActive,
  createdAt,
}: StoreStatusPopupProps) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [trialEnded, setTrialEnded] = useState(false);

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

    // Don't show popup for APPROVED status
    if (statusEnum === StoreStatus.APPROVED) {
      setShow(false);
      return;
    }

    // For TRIAL status, handle countdown
    if (statusEnum === StoreStatus.TRIAL) {
      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      const secondsElapsed = Math.floor((now - createdTime) / 1000);
      const remaining = SEVEN_DAYS - secondsElapsed;

      if (remaining > 0) {
        setCountdown(remaining);
        setTrialEnded(false);
        setShow(true);
      } else {
        // Trial period has ended
        setTrialEnded(true);
        setShow(true);
      }
    } else {
      // For other statuses (PENDING, REJECTED), just show the popup
      setShow(true);
    }
  }, [statusEnum, createdAt, SEVEN_DAYS]);

  // Countdown timer (only for TRIAL)
  useEffect(() => {
    if (
      !show ||
      countdown <= 0 ||
      trialEnded ||
      statusEnum !== StoreStatus.TRIAL
    )
      return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTrialEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, countdown, trialEnded, statusEnum]);

  const handleClose = () => {
    setShow(false);
  };

  if (!show || !statusEnum) return null;

  const formatTime = (secs: number) => {
    const d = Math.floor(secs / (24 * 3600));
    const h = Math.floor((secs % (24 * 3600)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  // PENDING STATUS - Payment Verification
  if (statusEnum === StoreStatus.PENDING) {
    return (
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 sm:w-96 w-auto p-4 sm:p-6 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-2xl rounded-lg border-2 border-blue-400 dark:border-blue-600 max-w-md mx-auto sm:mx-0">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
            <h3 className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">
              Payment Verification
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-3">
          We&apos;re verifying your payment. Your store will be activated
          shortly.
        </p>
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Verification in progress...
            </p>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            This usually takes 10-15 minutes. You&apos;ll receive an email once
            your store is active.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/contact-us"
            target="_blank"
            className="flex-1 border-2 border-blue-600 text-blue-600! dark:text-blue-300! hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-lg transition cursor-pointer text-center"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // REJECTED STATUS
  if (statusEnum === StoreStatus.REJECTED) {
    return (
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 sm:w-96 w-auto p-4 sm:p-6 bg-linear-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 shadow-2xl rounded-lg border-2 border-red-500 dark:border-red-600 max-w-md mx-auto sm:mx-0">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300">
              Store Application Rejected
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 mb-4">
          Unfortunately, your store application has been rejected.
        </p>
        <Link
          href="/contact-us"
          target="_blank"
          className="flex-1 inline-block w-full border-2 border-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600! dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-lg transition text-center cursor-pointer"
        >
          Contact Support
        </Link>
      </div>
    );
  }

  // TRIAL ENDED
  if (trialEnded) {
    return (
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 sm:w-96 w-auto p-4 sm:p-6 bg-linear-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 shadow-2xl rounded-lg border-2 border-red-400 dark:border-red-600 animate-pulse max-w-md mx-auto sm:mx-0">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300">
              Trial Period Ended
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 mb-4">
          Your 7-day trial has expired. Please upgrade to continue using all
          features.
        </p>
        <Link
          href="/contact-us"
          target="_blank"
          className="w-full inline-block text-white! border-2 border-red-600 bg-red-600 hover:bg-red-700 text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-lg transition text-center"
        >
          Upgrade Now
        </Link>
      </div>
    );
  }

  // ACTIVE TRIAL COUNTDOWN
  const isExpiringSoon = countdown < 24 * 3600; // Less than 1 day

  return (
    <div
      className={`fixed top-4 right-4 left-4 sm:left-auto z-50 sm:w-80 w-auto p-3 sm:p-4 shadow-lg rounded-lg border transition-all max-w-md mx-auto sm:mx-0 ${
        isExpiringSoon
          ? "bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 animate-pulse"
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                isExpiringSoon
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            />
            <h3 className="text-xs sm:text-sm font-semibold truncate">
              Store Status: {STORE_STATUS_LABELS[statusEnum]}
            </h3>
          </div>
          <p
            className={`text-xs font-medium wrap-break-word ${
              isExpiringSoon
                ? "text-orange-700 dark:text-orange-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {isExpiringSoon ? "⏰ Expiring soon: " : "Trial expires in: "}
            <span className="font-mono font-bold">{formatTime(countdown)}</span>
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-bold shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}