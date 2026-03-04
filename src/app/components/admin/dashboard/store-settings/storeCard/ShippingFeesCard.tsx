// File: app/components/admin/dashboard/store-settings/storeCard/ShippingFeesCard.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShippingFees, StoreSettings } from "@/lib/types/store/store";
import { CURRENCY_ICONS, Currency } from "@/lib/types/enums";
import { Package, Clock, ArrowUpRight, Truck, EyeOff } from "lucide-react";

export function ShippingFeesCard({
  fees,
  settings,
}: {
  fees?: ShippingFees | null;
  settings: StoreSettings;
}) {
  const currencyIcon = CURRENCY_ICONS[settings.currency as Currency];
  const hasFees = fees && fees.length > 0;

  return (
    <Card className="border-0 shadow-sm bg-card ring-1 ring-border/60 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center">
              <Truck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Shipping Methods
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasFees
                  ? `${fees.length} method${fees.length !== 1 ? "s" : ""} configured`
                  : "No shipping methods configured"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/shipping-Management"
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            Manage
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </CardHeader>

      {hasFees ? (
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fees.map((fee, index) => (
              <div
                key={index}
                className={`relative rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${
                  fee.customer_view === false
                    ? "border-border/30 bg-muted/10 opacity-70"
                    : "border-border/50 bg-card hover:border-border"
                }`}
              >
                {fee.customer_view === false && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </div>
                )}

                <div className="flex items-start gap-2.5 mb-3 pr-16">
                  <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {fee.name}
                    </h4>
                    {fee.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {fee.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {fee.estimated_days !== undefined
                      ? `${fee.estimated_days} day${Number(fee.estimated_days) > 1 ? "s" : ""}`
                      : "No estimate"}
                  </div>
                  <span
                    className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                      fee.price === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {fee.price === 0 ? "FREE" : `${currencyIcon} ${fee.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      ) : (
        <div className="px-5 py-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Truck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              No shipping methods yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Configure your shipping options to start accepting orders.
            </p>
          </div>
          <Link
            href="/dashboard/shipping-Management"
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Set up shipping <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="px-5 py-3 border-t border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Manage all shipping options in the{" "}
          <Link
            href="/dashboard/shipping-Management"
            target="_blank"
            className="text-primary font-medium hover:underline"
          >
            Shipping Management page
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}
