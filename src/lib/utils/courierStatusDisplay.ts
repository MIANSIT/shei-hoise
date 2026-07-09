export interface CourierStatusStyle {
  border: string;
  dot: string;
  text: string;
}

const STYLES: Record<"green" | "blue" | "amber" | "red" | "gray", CourierStatusStyle> = {
  green: { border: "border-l-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  blue: { border: "border-l-blue-500", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  amber: { border: "border-l-amber-500", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  red: { border: "border-l-red-500", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  gray: {
    border: "border-l-gray-300 dark:border-l-gray-600",
    dot: "bg-gray-400",
    text: "text-gray-500 dark:text-gray-400",
  },
};

/**
 * Pathao and Steadfast each use their own status vocabulary (PascalCase
 * underscored vs lowercase, and neither is a fixed enum), so this
 * classifies by keyword rather than an exact match list — a status value
 * neither courier has sent before still gets a sensible color instead of
 * falling through to "unknown."
 */
export function getCourierStatusStyle(status: string | null | undefined): CourierStatusStyle {
  if (!status) return STYLES.gray;
  const s = status.toLowerCase();

  if (s === "pending") return STYLES.gray;
  if (s.includes("fail") || s.includes("cancel")) return STYLES.red;
  if (s.includes("hold") || s.includes("partial") || s.includes("return")) return STYLES.amber;
  if (s.includes("deliver") || s.includes("paid")) return STYLES.green;
  return STYLES.blue;
}

/** "Assigned_for_Pickup" -> "Assigned For Pickup", "in_review" -> "In Review" */
export function prettifyCourierStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}
