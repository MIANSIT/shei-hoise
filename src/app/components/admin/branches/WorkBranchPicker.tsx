"use client";

import { Select } from "antd";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";

interface WorkBranchPickerProps {
  /** Text before the picker, e.g. "Selling from". */
  label: string;
  /** Called before switching, e.g. to clear a cart checked against the old branch. */
  onBeforeChange?: (nextBranchId: string) => void;
}

/**
 * Picks the branch you're working at (Quick Sale, Register Audit) without
 * switching the whole dashboard. Shows just the name when there's only one
 * branch to work at. Renders nothing for stores without branches.
 */
export function WorkBranchPicker({ label, onBeforeChange }: WorkBranchPickerProps) {
  const t = useTranslation();
  const { enabled, branches, workBranchId, setWorkBranchId } = useBranches();
  if (!enabled) return null;

  const options = branches.filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {options.length > 1 ? (
        <Select
          size="small"
          className="min-w-40"
          aria-label={label}
          placeholder={t.branches.pickBranchToSell}
          value={workBranchId ?? undefined}
          onChange={(v: string) => {
            if (v !== workBranchId) onBeforeChange?.(v);
            setWorkBranchId(v);
          }}
          options={options}
          popupMatchSelectWidth={false}
        />
      ) : (
        <span className="font-semibold text-teal-700 dark:text-teal-300">
          {options[0]?.label ?? t.branches.pickBranchToSell}
        </span>
      )}
    </div>
  );
}
