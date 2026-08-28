import type { ReactNode } from "react";

export type VendorStatTone = "indigo" | "emerald" | "amber" | "rose" | "sky" | "slate";

// Same visual language as the main dashboard's StatCard.tsx (top accent
// bar, token-driven card/border/text, tinted icon chip) — this used to be
// raw inline gradient hex per caller, which ignored dark mode entirely.
const TONE: Record<VendorStatTone, { bar: string; chip: string }> = {
  indigo: {
    bar: "from-indigo-400 to-purple-400",
    chip: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30",
  },
  emerald: {
    bar: "from-emerald-400 to-teal-400",
    chip: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  },
  amber: {
    bar: "from-amber-400 to-orange-400",
    chip: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  },
  rose: {
    bar: "from-rose-400 to-red-400",
    chip: "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
  },
  sky: {
    bar: "from-sky-400 to-blue-400",
    chip: "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
  },
  slate: {
    bar: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
    chip: "bg-muted text-muted-foreground border-border",
  },
};

interface VendorStatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone: VendorStatTone;
  hint?: string;
}

export function VendorStatCard({ icon, label, value, tone, hint }: VendorStatCardProps) {
  const t = TONE[tone];
  return (
    <div className="relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden bg-card border border-border/80 shadow-sm dark:shadow-none">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${t.bar}`} />
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${t.chip}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-black tabular-nums text-foreground truncate">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

export default VendorStatCard;
