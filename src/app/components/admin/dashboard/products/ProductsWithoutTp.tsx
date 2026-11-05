"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spin } from "antd";
import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { OrderLinesWithoutCost } from "./OrderLinesWithoutCost";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  product_type: string | null;
  tp_price: number | null;
  variants: { id: string; variant_name: string | null; tp_price: number | null; is_active: boolean | null }[] | null;
}

interface MissingItem {
  key: string;
  slug: string;
  name: string;
  variantName: string | null;
}

/**
 * Products that have no TP: a product with no active variants and no TP, or an active variant with no TP.
 * Their profit is counted as free until the TP is added, and they cannot be sold from Quick Sale or Create Order.
 * Bundles take the TP of their parts, so they are not listed.
 */
export default function ProductsWithoutTp() {
  const t = useTranslation();
  const { storeId, loading: userLoading } = useCurrentUser();
  const [items, setItems] = useState<MissingItem[] | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    fetchAllPaged<ProductRow>((from, to) =>
      supabase
        .from("products")
        .select("id, name, slug, product_type, tp_price, variants:product_variants(id, variant_name, tp_price, is_active)")
        .eq("store_id", storeId)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: ProductRow[] | null; error: { message: string } | null }>,
    )
      .then((rows) => {
        if (cancelled) return;
        const list: MissingItem[] = [];
        for (const p of rows) {
          if (p.product_type === "bundle") continue;
          const active = (p.variants ?? []).filter((v) => v.is_active !== false);
          if (active.length > 0) {
            for (const v of active) {
              if (!(Number(v.tp_price) > 0)) list.push({ key: `${p.id}:${v.id}`, slug: p.slug, name: p.name, variantName: v.variant_name });
            }
          } else if (!(Number(p.tp_price) > 0)) {
            list.push({ key: p.id, slug: p.slug, name: p.name, variantName: null });
          }
        }
        list.sort((a, b) => a.name.localeCompare(b.name));
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (userLoading || items === null) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-5 sm:px-6">
      <div>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">{t.admin.npTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.npSub}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">{t.admin.npEmpty}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-border rounded-2xl border border-border bg-card p-0">
          {items.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 font-medium text-foreground">
                {item.name}
                {item.variantName ? <span className="font-normal text-muted-foreground"> · {item.variantName}</span> : null}
              </span>
              <Link href={`/dashboard/products/edit-product/${item.slug}`} className="shrink-0 font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300">
                {t.admin.npAddTp}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <OrderLinesWithoutCost />
    </div>
  );
}
