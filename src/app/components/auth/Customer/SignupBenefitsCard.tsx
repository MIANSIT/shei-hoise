"use client";

import { Check } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";

export function SignupBenefitsCard() {
  const t = useTranslation();
  return (
    <div className="p-5 bg-gradient-to-r from-chart-2/5 to-chart-2/10 rounded-xl border border-chart-2/20 mt-4">
      <h4 className="font-semibold text-base mb-3 flex items-center gap-3 text-foreground">
        <Check className="h-5 w-5 text-chart-2" />
        {t.auth.whatYoullGet}
      </h4>
      <ul className="text-sm text-muted-foreground space-y-2.5">
        <li className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
          <span>{t.auth.benefitOrdersTracking}</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
          <span>{t.auth.benefitFasterCheckoutFuture}</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-chart-2 mt-2 flex-shrink-0"></div>
          <span>{t.auth.benefitOrderHistory}</span>
        </li>
      </ul>
    </div>
  );
}