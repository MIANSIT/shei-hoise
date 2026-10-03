"use client";

import { useTranslation } from "@/lib/hook/useTranslation";
import type { MenuLabelKey } from "@/lib/menu";

interface MenuLabelProps {
  labelKey: MenuLabelKey;
}

/**
 * A sidebar menu label in the current language. Page headings use it so a
 * page is always called exactly what the menu link that opens it says — and
 * it works inside server-component pages, which can't call useTranslation.
 */
export function MenuLabel({ labelKey }: MenuLabelProps) {
  const t = useTranslation();
  return <>{t.admin[labelKey]}</>;
}
