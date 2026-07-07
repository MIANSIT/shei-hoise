"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Truck, ExternalLink, RefreshCw, PackageSearch, ChevronDown } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getCourierShipments,
  type CourierShipmentSummary,
} from "@/lib/queries/courier/getCourierShipments";
import type { CourierType } from "@/lib/queries/courier/getConnectedCourierAccounts";
import { refreshPathaoOrderStatus } from "@/lib/queries/pathao/getPathaoOrderStatus";
import { refreshSteadfastOrderStatus } from "@/lib/queries/steadfast/getSteadfastOrderStatus";

interface CourierShipmentsListProps {
  storeId: string;
  courier: CourierType;
}

function buildPathaoTrackingUrl(consignmentId: string, phone: string): string {
  return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(
    consignmentId,
  )}&phone=${encodeURIComponent(phone)}`;
}

export function CourierShipmentsList({ storeId, courier }: CourierShipmentsListProps) {
  const notify = useSheiNotification();
  const t = useTranslation();

  const [shipments, setShipments] = useState<CourierShipmentSummary[] | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    getCourierShipments(storeId, courier).then(setShipments);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, courier]);

  const handleRefresh = async (shipment: CourierShipmentSummary) => {
    if (!shipment.credentialId) return;
    setRefreshingId(shipment.trackingId);
    try {
      const result =
        courier === "steadfast"
          ? await refreshSteadfastOrderStatus(shipment.credentialId, shipment.orderId, shipment.consignmentId)
          : await refreshPathaoOrderStatus(shipment.credentialId, shipment.orderId, shipment.consignmentId);
      if (!result.success) {
        notify.error(result.error ?? t.admin.pathaoShipmentFailed);
        return;
      }
      load();
    } finally {
      setRefreshingId(null);
    }
  };

  if (shipments === null) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t.admin.loading}</p>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
        <PackageSearch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.admin.pathaoNoShipmentsTitle}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t.admin.pathaoNoShipmentsHint}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {shipments.map((s) => {
        const isExpanded = expandedId === s.trackingId;
        const d = s.details;

        return (
          <div
            key={s.trackingId}
            className={`rounded-xl border bg-white dark:bg-gray-800 overflow-hidden ${
              s.isActive
                ? "border-gray-200 dark:border-gray-700"
                : "border-gray-200 dark:border-gray-700 opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />

              <div className="min-w-0">
                <Link
                  href={`/dashboard/orders?search=${encodeURIComponent(s.orderNumber)}`}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  #{s.orderNumber}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  {s.recipientName} {s.accountLabel ? `· ${s.accountLabel}` : ""}
                </p>
              </div>

              {!s.isActive && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {t.admin.courierShipmentInactive}
                </span>
              )}

              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {s.orderStatus || "—"}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRefresh(s)}
                  disabled={refreshingId === s.trackingId}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshingId === s.trackingId ? "animate-spin" : ""}`}
                  />
                </Button>
                {courier === "pathao" ? (
                  <a
                    href={buildPathaoTrackingUrl(s.consignmentId, s.recipientPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      {t.admin.pathaoTrackOnPathao}
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground font-mono px-1">
                    {s.consignmentId}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(isExpanded ? null : s.trackingId)}
                >
                  {isExpanded ? t.admin.pathaoHideDetails : t.admin.pathaoViewDetails}
                  <ChevronDown
                    className={`h-3.5 w-3.5 ml-1.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3.5">
                {!d ? (
                  <p className="text-xs text-muted-foreground">{t.admin.pathaoDetailsUnavailable}</p>
                ) : d.courier === "pathao" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                    <DetailField label={t.admin.pathaoDeliveryFee} value={`৳ ${d.deliveryFee}`} />
                    <DetailField label={t.admin.pathaoAmountToCollect} value={`৳ ${d.amountToCollect}`} />
                    <DetailField label={t.admin.pathaoProductType} value={d.productType} />
                    <DetailField label={t.admin.pathaoDeliveryTypeLabel} value={d.deliveryType} />
                    <DetailField label={t.admin.pathaoWeightLabel} value={`${d.weight} kg`} />
                    {d.description && (
                      <DetailField
                        label={t.admin.pathaoProductDescription}
                        value={d.description}
                        className="col-span-2 sm:col-span-3"
                      />
                    )}
                    {d.specialInstruction && (
                      <DetailField
                        label={t.admin.pathaoSpecialInstructionLabel}
                        value={d.specialInstruction}
                        className="col-span-2 sm:col-span-3"
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                    <DetailField label={t.admin.pathaoAmountToCollect} value={`৳ ${d.codAmount}`} />
                    {d.description && (
                      <DetailField
                        label={t.admin.pathaoProductDescription}
                        value={d.description}
                        className="col-span-2 sm:col-span-3"
                      />
                    )}
                    {d.note && (
                      <DetailField
                        label={t.admin.steadfastNote}
                        value={d.note}
                        className="col-span-2 sm:col-span-3"
                      />
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {t.admin.pathaoFinancialLedgerNote}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground wrap-break-word">{value}</p>
    </div>
  );
}
