"use client";

import { useBranches } from "@/lib/context/BranchContext";
import { useLocalNum } from "@/lib/hook/useLocalNum";

interface BranchStockLineProps {
  branchStock?: { branch_id: string; available: number }[];
}

/**
 * "Mirpur 40 · Dhanmondi 12" under a stock number — shown only in the
 * "All branches" view of a store with branches, so the owner can see where
 * the total is.
 */
export function BranchStockLine({ branchStock }: BranchStockLineProps) {
  const { enabled, selectedBranchId, branches } = useBranches();
  const n = useLocalNum();
  if (!enabled || selectedBranchId || !branchStock?.length) return null;

  const byId = new Map(branchStock.map((b) => [b.branch_id, b.available]));
  const parts = branches
    .filter((b) => b.isActive && byId.has(b.id))
    .map((b) => `${b.name} ${n(byId.get(b.id) ?? 0)}`);
  if (parts.length === 0) return null;

  return <div className="text-[11px] leading-snug text-muted-foreground">{parts.join(" · ")}</div>;
}
