"use client";

import { memo, useMemo } from "react";
import { Wallet, TrendingUp, LayoutGrid } from "lucide-react";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Expense, ExpenseCategory } from "@/lib/types/expense/type";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";

interface StatItem {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconBg: string;
  iconBgDark: string;
  trend: { up: boolean; pct: string } | null;
  sub: string;
}

interface ExpenseStatsProps {
  filtered: Expense[];
  expenses: Expense[];
  categories: ExpenseCategory[];
}

function sumAmounts(list: Expense[]): number {
  return list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

function ExpenseStats({ filtered, expenses, categories }: ExpenseStatsProps) {
  const { icon: currencyIcon } = useUserCurrencyIcon();

  function formatCurrency(amount: number): React.ReactNode {
    return (
      <span className="flex items-center gap-0.5">
        <span>{currencyIcon}</span>
        <span>
          {amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </span>
    );
  }

  const stats = useMemo<StatItem[]>(() => {
    const now = dayjs();
    const lastMonth = now.subtract(1, "month");
    const thisMonthTotal = sumAmounts(
      expenses.filter((e) => dayjs(e.expense_date).isSame(now, "month")),
    );
    const lastMonthTotal = sumAmounts(
      expenses.filter((e) => dayjs(e.expense_date).isSame(lastMonth, "month")),
    );
    const monthChange =
      lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;
    const usedCategoryCount = new Set(
      filtered.map((e) => e.category_id).filter(Boolean),
    ).size;
    return [
      {
        title: "Filtered Total",
        value: formatCurrency(sumAmounts(filtered)),
        icon: <Wallet size={20} color="#6366f1" strokeWidth={1.8} />,
        iconBg: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
        iconBgDark: "linear-gradient(135deg, #1e1b4b, #312e81)",
        trend: null,
        sub: `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`,
      },
      {
        title: "This Month",
        value: formatCurrency(thisMonthTotal),
        icon: <TrendingUp size={20} color="#10b981" strokeWidth={1.8} />,
        iconBg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
        iconBgDark: "linear-gradient(135deg, #022c22, #064e3b)",
        trend:
          monthChange !== 0
            ? { up: monthChange > 0, pct: Math.abs(monthChange).toFixed(1) }
            : null,
        sub: "vs last month",
      },
      {
        title: "Categories",
        value: String(usedCategoryCount),
        icon: <LayoutGrid size={20} color="#8b5cf6" strokeWidth={1.8} />,
        iconBg: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
        iconBgDark: "linear-gradient(135deg, #1e1b4b, #2e1065)",
        trend: null,
        sub: "available",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, expenses, categories, currencyIcon]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="
            bg-white dark:bg-gray-800
            border border-gray-100 dark:border-gray-700
            rounded-2xl p-4 sm:p-5
            flex items-center gap-4
            shadow-sm hover:shadow-md
            transition-shadow duration-200
          "
        >
          <div
            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background: stat.iconBg }}
          >
            {stat.icon}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-widest m-0">
              {stat.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight tabular-nums">
                {stat.value}
              </span>
              {stat.trend && (
                <span
                  className={`
                    text-[11px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full
                    ${
                      stat.trend.up
                        ? "text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400"
                        : "text-emerald-500 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400"
                    }
                  `}
                >
                  {stat.trend.up ? (
                    <ArrowUpOutlined style={{ fontSize: 9 }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: 9 }} />
                  )}
                  {stat.trend.pct}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-300 dark:text-gray-600 m-0 mt-0.5">
              {stat.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ExpenseStats);
