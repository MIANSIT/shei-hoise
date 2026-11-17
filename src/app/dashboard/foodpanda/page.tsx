"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Select, Tag } from "antd";
import { Store, RefreshCw, Loader2, PowerOff, Power } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  FoodpandaConnectCard,
  FoodpandaWebhookUrls,
} from "@/app/components/admin/dashboard/foodpanda/FoodpandaConnectCard";
import {
  getFoodpandaAccounts,
  type FoodpandaAccountSummary,
} from "@/lib/queries/foodpanda/getFoodpandaAccounts";
import {
  readFoodpandaOutletStatus,
  writeFoodpandaOutletStatus,
} from "@/lib/queries/foodpanda/foodpandaOutlet";
import {
  syncFoodpandaCatalog,
  getFoodpandaCatalogJobs,
  type CatalogJobRow,
} from "@/lib/queries/foodpanda/syncFoodpandaCatalog";
import { FOODPANDA_CLOSED_REASONS } from "@/lib/utils/foodpandaApi";

export default function FoodpandaPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const notify = useSheiNotification();

  const [accounts, setAccounts] = useState<FoodpandaAccountSummary[] | null>(null);
  const [active, setActive] = useState<FoodpandaAccountSummary | null>(null);
  const [outlet, setOutlet] = useState<string | null>(null);
  const [outletBusy, setOutletBusy] = useState(false);
  const [closeReason, setCloseReason] = useState<string>("TOO_BUSY_KITCHEN");
  const [syncing, setSyncing] = useState(false);
  const [jobs, setJobs] = useState<CatalogJobRow[]>([]);

  const load = useCallback(async () => {
    const list = await getFoodpandaAccounts();
    setAccounts(list);
    setActive((prev) => list.find((a) => a.id === prev?.id) ?? list[0] ?? null);
  }, []);

  useEffect(() => {
    if (storeId) void load();
  }, [storeId, load]);

  // Outlet status and job history follow whichever account is selected.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void readFoodpandaOutletStatus(active.id).then((r) => {
      if (!cancelled) setOutlet(r.success ? (r.status ?? "UNKNOWN") : null);
    });
    void getFoodpandaCatalogJobs(active.id).then((j) => {
      if (!cancelled) setJobs(j);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const setStatus = async (status: "OPEN" | "CLOSED") => {
    if (!active) return;
    setOutletBusy(true);
    try {
      const result = await writeFoodpandaOutletStatus(
        active.id,
        status,
        status === "CLOSED" ? { closedReason: closeReason } : {},
      );
      if (!result.success) {
        notify.error(result.error ?? "Could not change the outlet status");
        return;
      }
      setOutlet(status);
      notify.success(status === "OPEN" ? "Outlet is open on foodpanda" : "Outlet closed on foodpanda");
    } catch (err) {
      console.error("foodpanda outlet update failed:", err);
      notify.error(err instanceof Error ? err.message : "Could not change the outlet status");
    } finally {
      setOutletBusy(false);
    }
  };

  const runSync = async () => {
    if (!active) return;
    setSyncing(true);
    try {
      const result = await syncFoodpandaCatalog(active.id);
      if (!result.success) {
        notify.error(result.error ?? "Catalog sync failed");
        return;
      }
      notify.success(`Syncing ${result.productCount} products — foodpanda will confirm shortly`);
      setJobs(await getFoodpandaCatalogJobs(active.id));
    } catch (err) {
      console.error("foodpanda catalog sync failed:", err);
      notify.error(err instanceof Error ? err.message : "Catalog sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (userLoading || accounts === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">No store assigned to this account.</p>
      </div>
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const isOpen = outlet === "OPEN";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-pink-400 to-rose-600 flex items-center justify-center shrink-0">
            <Store size={18} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">
              foodpanda
            </h1>
            <p className="text-xs text-muted-foreground m-0">
              Take foodpanda orders in this dashboard and keep your menu in step
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 space-y-4">
        {accounts.length === 0 ? (
          <FoodpandaConnectCard onConnected={load} />
        ) : (
          <>
            {accounts.length > 1 && (
              <Select
                className="w-full sm:w-72"
                value={active?.id}
                onChange={(id) => setActive(accounts.find((a) => a.id === id) ?? null)}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.label} · ${a.vendorId} (${a.environment})`,
                }))}
              />
            )}

            {active && (
              <>
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold m-0">{active.label}</h2>
                        <Tag color={active.environment === "live" ? "green" : "gold"}>
                          {active.environment}
                        </Tag>
                        {outlet && (
                          <Tag color={isOpen ? "green" : "red"}>
                            {isOpen ? "Taking orders" : outlet}
                          </Tag>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground m-0 mt-1 font-mono">
                        chain {active.chainId.slice(0, 8)}… · vendor {active.vendorId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isOpen && (
                        <Select
                          className="w-48"
                          value={closeReason}
                          onChange={setCloseReason}
                          options={FOODPANDA_CLOSED_REASONS.map((r) => ({
                            value: r,
                            label: r.replaceAll("_", " ").toLowerCase(),
                          }))}
                        />
                      )}
                      <Button
                        variant={isOpen ? "outline" : "default"}
                        onClick={() => setStatus(isOpen ? "CLOSED" : "OPEN")}
                        disabled={outletBusy}
                      >
                        {outletBusy ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : isOpen ? (
                          <PowerOff className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <Power className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {isOpen ? "Close outlet" : "Open outlet"}
                      </Button>
                    </div>
                  </div>
                  {outlet === null && (
                    <p className="text-xs text-amber-700 mt-2 m-0">
                      Could not read the outlet status from foodpanda. The connection may need
                      reconnecting.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-base font-semibold m-0">Menu sync</h2>
                      <p className="text-xs text-muted-foreground m-0 mt-0.5">
                        Pushes price and availability for every product that has a foodpanda SKU.
                      </p>
                    </div>
                    <Button onClick={runSync} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {syncing ? "Syncing…" : "Sync now"}
                    </Button>
                  </div>

                  {jobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground m-0">No syncs yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {jobs.map((j) => (
                        <div
                          key={j.id}
                          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">{j.jobType}</span>
                          <span className="font-mono">{j.jobId.slice(0, 12)}…</span>
                          <Tag
                            color={
                              j.status === "COMPLETED" ? "green" : j.status === "FAILED" ? "red" : "blue"
                            }
                          >
                            {j.status}
                          </Tag>
                          <span>{j.productCount} products</span>
                          <span className="ml-auto">
                            {new Date(j.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FoodpandaWebhookUrls accountId={active.id} siteUrl={siteUrl} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
