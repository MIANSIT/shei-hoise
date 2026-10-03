"use client";

import { Tag } from "antd";
import { useBranches } from "@/lib/context/BranchContext";
import { useTranslation } from "@/lib/hook/useTranslation";

interface OrderBranchTagProps {
  branchId?: string | null;
  needsTransfer?: boolean;
  confirmed?: boolean;
}

/** The order's branch as a small tag in order lists (stores with branches only). */
export function OrderBranchTag({ branchId, needsTransfer, confirmed }: OrderBranchTagProps) {
  const t = useTranslation();
  const { enabled, branchName } = useBranches();
  if (!enabled) return null;
  const name = branchName(branchId);
  return (
    <>
      {name && (
        <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
          {name}
        </Tag>
      )}
      {needsTransfer ? (
        <Tag color="red" style={{ marginInlineEnd: 0 }}>
          {t.branches.needsTransfer}
        </Tag>
      ) : confirmed === false ? (
        <Tag color="gold" style={{ marginInlineEnd: 0 }}>
          {t.branches.waitingConfirm}
        </Tag>
      ) : null}
    </>
  );
}
