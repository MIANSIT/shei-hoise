const PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
];

/** Deterministic initial + color pair for a reviewer avatar — same name always renders the same color, no state or lookup needed. */
export function getAvatarProps(name: string): { initial: string; colorClass: string } {
  const trimmed = name.trim();
  const initial = trimmed ? trimmed[0].toUpperCase() : "?";
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  const colorClass = PALETTE[hash % PALETTE.length];
  return { initial, colorClass };
}
