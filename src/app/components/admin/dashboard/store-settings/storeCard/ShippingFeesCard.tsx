"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ShippingFees, StoreSettings } from "@/lib/types/store/store";
import { CURRENCY_ICONS, Currency } from "@/lib/types/enums";

export function ShippingFeesCard({
  fees,
  settings,
}: {
  fees?: ShippingFees | null;
  settings: StoreSettings;
}) {
  const currencyIcon = CURRENCY_ICONS[settings.currency as Currency];

  return (
    <Card className="border shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="bg-background  p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold text-primary">
              Shipping Methods
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {fees && fees.length > 0
                ? `${fees.length} shipping option${
                    fees.length !== 1 ? "s" : ""
                  } available`
                : "No shipping methods configured"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 font-medium text-muted-foreground border-ring"
          >
            {currencyIcon}
          </Badge>
        </div>
      </CardHeader>

      {fees && fees.length > 0 && (
        <CardContent className="p-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fees.map((fee, index) => (
              <div
                key={index}
                className="flex flex-col justify-between p-4 rounded-xl border hover:shadow-lg transition-shadow duration-200 bg-background"
              >
                {/* Top row: Name + Description */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div>
                    <h4 className="font-semibold text-primary text-base sm:text-lg">
                      {fee.name}
                    </h4>
                    {fee.description && (
                      <p className="text-ring text-sm mt-1 sm:mt-0.5">
                        {fee.description}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-0">
                    {fee.estimated_days !== undefined
                      ? `${fee.estimated_days} day${
                          fee.estimated_days > 1 ? "s" : ""
                        }`
                      : "No estimate"}
                  </span>
                </div>

                {/* Bottom row: Price */}
                <div className="mt-3 sm:mt-2 flex justify-end">
                  <span
                    className={`font-bold text-sm sm:text-base px-3 py-1 rounded-lg border ${
                      fee.price === 0
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {fee.price === 0 ? "FREE" : `${currencyIcon} ${fee.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {/* Persistent Manage Shipping link */}
      <div className="px-6 py-4 border-t bg-background text-xs sm:text-sm text-ring">
        You can manage shipping methods in the{" "}
        <Link
          href="/dashboard/shipping-Management"
          target="_blank"
          className="text-badge underline font-medium hover:text-chart-1 transition-colors"
        >
          Shipping Management page
        </Link>
        .
      </div>
    </Card>
  );
}
