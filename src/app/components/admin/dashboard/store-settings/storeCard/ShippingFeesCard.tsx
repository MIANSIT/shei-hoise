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
  // Get currency icon from settings
  const currencyIcon = CURRENCY_ICONS[settings.currency as Currency];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold">
              Shipping Methods
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {fees && fees.length > 0
                ? `${fees.length} shipping option${
                    fees.length !== 1 ? "s" : ""
                  } available`
                : "No shipping methods configured"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="font-normal self-start sm:self-auto text-xs sm:text-sm px-2 py-1"
          >
            {currencyIcon}
          </Badge>
        </div>
      </CardHeader>

      {fees && fees.length > 0 && (
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {fees.map((fee, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 sm:p-4 rounded-lg border hover:border-primary/50 transition-all hover:shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-semibold text-sm sm:text-base">
                    {fee.name}
                  </span>
                  {fee.description && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {fee.description}
                    </span>
                  )}
                </div>
                <span className="font-bold text-sm sm:text-base whitespace-nowrap">
                  {fee.price === 0 ? "FREE" : `${currencyIcon} ${fee.price}`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {/* Persistent Manage Shipping link using Next.js Link */}
      <div className="px-4 py-3 border-t text-xs sm:text-sm text-muted-foreground">
        <p className="text-center sm:text-left">
          You can manage shipping methods in the{" "}
          <span className="md:hidden">
            <br />
          </span>
          <Link
            href="/dashboard/shipping-Management"
            target="_blank"
            className="text-primary underline hover:text-primary/80 transition-colors font-medium"
          >
            Shipping Management page
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}
