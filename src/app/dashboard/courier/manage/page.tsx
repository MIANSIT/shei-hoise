"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackageCheck, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import {
  getConnectedCourierAccounts,
  type CourierAccountStatus,
} from "@/lib/queries/courier/getConnectedCourierAccounts";
import { getDeliveryCouriers } from "@/lib/queries/deliveryCouriers/getDeliveryCouriers";
import { updateDeliveryCouriers } from "@/lib/queries/deliveryCouriers/updateDeliveryCouriers";
import type { DeliveryCourier } from "@/lib/types/store/store";
import FeatureLocked from "@/app/components/admin/common/FeatureLocked";

function courierHref(courier: DeliveryCourier): string {
  if (courier.type === "pathao") return "/dashboard/courier/pathao";
  if (courier.type === "steadfast") return "/dashboard/courier/steadfast";
  return `/dashboard/courier/manual/${courier.id}`;
}

export default function DeliveryCourierManagePage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const { loading: featureLoading, allowed } = useFeatureGate(storeId, "courier_tracking");
  const t = useTranslation();
  const notify = useSheiNotification();

  const [accounts, setAccounts] = useState<CourierAccountStatus[] | null>(null);
  const [couriers, setCouriers] = useState<DeliveryCourier[] | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = () => {
    if (!storeId) return;
    getConnectedCourierAccounts(storeId).then(setAccounts);
    getDeliveryCouriers(storeId).then(setCouriers);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const isConnected = (courier: DeliveryCourier): boolean =>
    (accounts ?? []).some((a) => a.courier === courier.type && a.connected);

  const builtIn = (couriers ?? []).filter((c) => !c.deletable);
  const custom = (couriers ?? []).filter((c) => c.deletable);

  const handleAdd = async () => {
    if (!storeId || !newName.trim() || !couriers) return;
    setAdding(true);
    try {
      const next: DeliveryCourier[] = [
        ...couriers,
        {
          id: crypto.randomUUID(),
          name: newName.trim(),
          type: "manual",
          deletable: true,
          created_at: new Date().toISOString(),
        },
      ];
      const result = await updateDeliveryCouriers(storeId, next);
      if (!result.success) {
        notify.error(result.error ?? t.admin.deliveryCourierSaveFailed);
        return;
      }
      setCouriers(next);
      setNewName("");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!storeId || !couriers) return;
    setRemovingId(id);
    try {
      const next = couriers.filter((c) => c.id !== id);
      const result = await updateDeliveryCouriers(storeId, next);
      if (!result.success) {
        notify.error(result.error ?? t.admin.deliveryCourierSaveFailed);
        return;
      }
      setCouriers(next);
    } finally {
      setRemovingId(null);
    }
  };

  if (userLoading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">{t.admin.storeNotAssigned}</p>
      </div>
    );
  }

  if (!allowed) {
    return <FeatureLocked title={t.admin.deliveryCourierPageTitle} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0">
            <PackageCheck size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white m-0 tracking-tight leading-tight">
              {t.admin.deliveryCourierPageTitle}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
              {t.admin.deliveryCourierPageSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-7 space-y-5">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {t.admin.deliveryCourierBuiltIn}
          </h2>

          {couriers === null ? (
            <p className="text-sm text-muted-foreground">{t.admin.loading}</p>
          ) : (
            builtIn.map((courier) => (
              <Link
                key={courier.id}
                href={courierHref(courier)}
                className="flex items-center justify-between border border-border rounded-lg px-3.5 py-2.5 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isConnected(courier) ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground">{courier.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isConnected(courier) ? t.admin.pathaoConnected : t.admin.pathaoNotConnected}
                </span>
              </Link>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {t.admin.deliveryCourierCustom}
          </h2>
          <p className="text-xs text-muted-foreground mb-2">{t.admin.deliveryCourierCustomHint}</p>

          {couriers === null ? (
            <p className="text-sm text-muted-foreground">{t.admin.loading}</p>
          ) : (
            custom.map((courier) => (
              <div
                key={courier.id}
                className="flex items-center justify-between border border-border rounded-lg px-3.5 py-2.5"
              >
                <span className="text-sm font-medium text-foreground">{courier.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(courier.id)}
                  disabled={removingId === courier.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.admin.deliveryCourierNamePlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
              <Plus className="h-3.5 w-3.5" />
              {t.admin.deliveryCourierAddBtn}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
