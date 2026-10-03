"use client";

import { useEffect, useState } from "react";
import { Radio, Spin } from "antd";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  getBranchAssignmentMode,
  setBranchAssignmentMode,
  type BranchAssignmentMode,
} from "@/lib/queries/orders/orderBranch";

/**
 * Owner setting: online orders go straight to the best branch, or wait in
 * "Needs a branch" until someone confirms one.
 */
export function BranchAssignmentSetting() {
  const t = useTranslation();
  const notify = useSheiNotification();
  const [mode, setMode] = useState<BranchAssignmentMode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBranchAssignmentMode().then((m) => {
      if (!cancelled) setMode(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (next: BranchAssignmentMode) => {
    const previous = mode;
    setMode(next);
    setSaving(true);
    const result = await setBranchAssignmentMode(next);
    setSaving(false);
    if (!result.ok) {
      setMode(previous);
      notify.error(result.error);
      return;
    }
    notify.success(t.branches.toastAssignmentSaved);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground m-0">{t.branches.assignmentTitle}</h2>
        <p className="text-xs text-muted-foreground m-0 mt-1">{t.branches.assignmentHint}</p>
      </div>
      {mode === null ? (
        <Spin size="small" />
      ) : (
        <Radio.Group
          value={mode}
          disabled={saving}
          onChange={(e) => change(e.target.value as BranchAssignmentMode)}
          className="flex! flex-col gap-2"
        >
          <Radio value="auto">
            <span className="font-medium">{t.branches.assignmentAuto}</span>
            <span className="block text-xs text-muted-foreground">{t.branches.assignmentAutoHint}</span>
          </Radio>
          <Radio value="confirm">
            <span className="font-medium">{t.branches.assignmentConfirm}</span>
            <span className="block text-xs text-muted-foreground">{t.branches.assignmentConfirmHint}</span>
          </Radio>
        </Radio.Group>
      )}
    </section>
  );
}
