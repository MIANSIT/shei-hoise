"use client";

import { Select } from "antd";
import { Building2 } from "lucide-react";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";

/**
 * Dashboard-wide branch picker in the header. Only shown once the store has
 * branches turned on; the choice is remembered per person.
 */
export function BranchSwitcher() {
  const t = useTranslation();
  const { enabled, branches, selectedBranchId, setSelectedBranchId, canSeeAllBranches } = useBranches();

  if (!enabled || branches.length === 0) return null;

  // Staff with a single branch have nothing to switch, so just show where they are.
  if (!canSeeAllBranches && branches.length === 1) {
    return (
      <span className="inline-flex max-w-36 sm:max-w-48 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-foreground">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{branches[0].name}</span>
      </span>
    );
  }

  const options = [
    ...(canSeeAllBranches ? [{ value: "all", label: t.branches.allBranches }] : []),
    ...branches.map((b) => ({
      value: b.id,
      label: b.isActive ? b.name : `${b.name} (${t.branches.inactiveShort})`,
    })),
  ];

  return (
    <Select
      size="middle"
      className="w-36 sm:w-48"
      aria-label={t.branches.switcherLabel}
      value={selectedBranchId ?? "all"}
      onChange={(v: string) => setSelectedBranchId(v === "all" ? null : v)}
      options={options}
      suffixIcon={<Building2 className="h-3.5 w-3.5" aria-hidden="true" />}
      popupMatchSelectWidth={false}
    />
  );
}
