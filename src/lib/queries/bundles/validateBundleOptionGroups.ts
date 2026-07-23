import { BundleItemType } from "@/lib/schema/bundleSchema";

// Plain sync helper — kept out of createBundle.ts/updateBundle.ts, which
// have "use server" and therefore require every export to be an async
// Server Action (same reason bundleItemKey.ts is split out). Re-validates
// server-side what bundleSchema's superRefine already checks client-side,
// since the client can't be trusted.
export function validateBundleOptionGroups(items: BundleItemType[]): void {
  const groups = new Map<string, BundleItemType[]>();
  for (const item of items) {
    if (!item.option_group_id) continue;
    const group = groups.get(item.option_group_id) ?? [];
    group.push(item);
    groups.set(item.option_group_id, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      throw new Error("❌ A choice group needs at least 2 alternatives");
    }
    const [first, ...rest] = group;
    if (rest.some((item) => item.quantity_needed !== first.quantity_needed)) {
      throw new Error(
        "❌ All alternatives in a choice group must share the same quantity"
      );
    }
    if (
      rest.some(
        (item) =>
          (item.option_group_label || "") !== (first.option_group_label || "")
      )
    ) {
      throw new Error(
        "❌ All alternatives in a choice group must share the same label"
      );
    }
  }
}
