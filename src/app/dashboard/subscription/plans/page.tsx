"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, Empty, Modal } from "antd";
import { ArrowLeft, Package, CheckCircle, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { getStoreSubscription } from "@/lib/queries/subscription/getStoreSubscription";
import { getPlansForStore } from "@/lib/queries/subscription/getPlansForStore";
import { parseFeatures, parseLimits, type PublicPlan } from "@/lib/queries/subscription/getPublicPlans";

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  billingCycle,
  hasSubscription,
  showAction,
  onSelect,
}: {
  plan: PublicPlan;
  isCurrent: boolean;
  billingCycle: string;
  hasSubscription: boolean;
  showAction: boolean;
  onSelect: (plan: PublicPlan) => void;
}) {
  const features = [...parseFeatures(plan.features), ...parseLimits(plan.limits)];
  const isYearly = billingCycle === "yearly";
  const price = isYearly ? plan.price_yearly : plan.price_monthly;
  const perMonth = isYearly ? plan.price_yearly / 12 : plan.price_monthly;
  const currency = plan.currency.trim();

  const VISIBLE_LIMIT = 5;
  const [expanded, setExpanded] = useState(false);
  const hasMore = features.length > VISIBLE_LIMIT;
  const visibleFeatures = expanded ? features : features.slice(0, VISIBLE_LIMIT);

  return (
    <div
      className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col gap-4 sm:gap-5 transition-all bg-white dark:bg-gray-900 ${
        isCurrent
          ? "border-violet-400 shadow-lg ring-2 ring-violet-300"
          : plan.is_featured
          ? "border-blue-300 shadow-xl lg:-translate-y-2"
          : "border-gray-200 dark:border-gray-700 shadow-sm"
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-violet-600 text-white text-xs font-semibold px-3.5 py-1 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" /> Current Plan
          </span>
        </div>
      )}
      {plan.is_featured && !isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-blue-500 text-white text-xs font-semibold px-3.5 py-1 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
            <Sparkles className="w-3 h-3" /> Most Popular
          </span>
        </div>
      )}

      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          isCurrent
            ? "bg-violet-100 dark:bg-violet-900/40"
            : plan.is_featured
            ? "bg-blue-100 dark:bg-blue-900/40"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        <Package
          className={`w-5 h-5 ${
            isCurrent
              ? "text-violet-600 dark:text-violet-400"
              : plan.is_featured
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {currency}{price.toLocaleString("en-BD")}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            /{isYearly ? "year" : "month"}
          </span>
        </div>
        {isYearly && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            ≈ {currency}{Math.round(perMonth).toLocaleString("en-BD")}/month billed yearly
          </p>
        )}
        {plan.trial_days > 0 && (
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">
            {plan.trial_days} days free trial
          </p>
        )}
      </div>

      {features.length > 0 && (
        <div className="flex-1">
          <ul className="space-y-2 sm:space-y-2.5">
            {visibleFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 mt-2.5"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  +{features.length - VISIBLE_LIMIT} more features <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {showAction && (
        <button
          type="button"
          onClick={() => onSelect(plan)}
          className={`w-full text-sm font-semibold py-3 rounded-xl transition-colors ${
            isCurrent
              ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/70"
              : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          }`}
        >
          {!hasSubscription ? "Get Started" : isCurrent ? "Renew" : "Switch to this plan"}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { storeId, loading: userLoading, role } = useCurrentUser();

  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const isSuperAdmin = role === "super_admin";
  const canPay = !isSuperAdmin;

  useEffect(() => {
    if (userLoading) return;
    if (!storeId && !isSuperAdmin) return;

    setLoading(true);

    async function load() {
      const sub = storeId ? await getStoreSubscription(storeId) : null;
      setCurrentPlanId(sub?.plan_id ?? null);
      setHasSubscription(!!sub);
      if (sub?.billing_cycle === "yearly" || sub?.billing_cycle === "monthly") {
        setBillingCycle(sub.billing_cycle);
      }

      const fetchedPlans = await getPlansForStore(role ?? "store_owner", sub?.plan_id ?? null);
      setPlans(fetchedPlans);
    }

    load().finally(() => setLoading(false));
  }, [storeId, userLoading, role, isSuperAdmin]);

  function handleSelectPlan(plan: PublicPlan) {
    const isYearly = billingCycle === "yearly";
    const price = isYearly ? plan.price_yearly : plan.price_monthly;
    const currency = plan.currency.trim();

    Modal.confirm({
      title: `Subscribe to ${plan.name}`,
      content: `You're about to start a ${isYearly ? "yearly" : "monthly"} subscription for ${currency}${price.toLocaleString("en-BD")}/${isYearly ? "year" : "month"}. You'll be taken to checkout next.`,
      okText: "Continue",
      cancelText: "Cancel",
      okButtonProps: { style: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" } },
      onOk: () => {
        router.push(`/dashboard/subscription/checkout?plan=${plan.id}&cycle=${billingCycle}`);
      },
    });
  }

  const hasYearly = plans.some((p) => p.price_yearly > 0);
  const visiblePlans =
    billingCycle === "yearly" ? plans.filter((p) => p.price_yearly > 0) : plans;

  if (userLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-8 px-4">
        <Skeleton active paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!storeId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Empty description="Store not found" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/dashboard/subscription")}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mb-6 sm:mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Subscription
      </button>

      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Choose Your Plan
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
          Simple, transparent pricing that grows with your store.
        </p>

        {hasYearly && (
          <div className="inline-flex items-center mt-6 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-violet-600 text-white shadow"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-violet-600 text-white shadow"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Yearly
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  billingCycle === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                }`}
              >
                Save
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Plans grid */}
      {visiblePlans.length === 0 ? (
        <Empty
          description={
            billingCycle === "yearly" ? "No plans available for yearly billing" : "No plans available"
          }
        />
      ) : (
        <div
          className={`grid grid-cols-1 gap-5 md:gap-8 mx-auto ${
            visiblePlans.length === 1
              ? "max-w-sm"
              : visiblePlans.length === 2
              ? "sm:grid-cols-2 max-w-3xl"
              : "sm:grid-cols-2 lg:grid-cols-3 max-w-6xl"
          }`}
        >
          {visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              billingCycle={billingCycle}
              hasSubscription={hasSubscription}
              showAction={canPay}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
