"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { getFoodpandaAccount } from "@/lib/utils/getFoodpandaAccount";
import { updateCatalogProducts } from "@/lib/utils/foodpandaApi";

export interface SyncCatalogResult {
  success: boolean;
  error?: string;
  jobId?: string;
  productCount?: number;
  skipped?: number;
}

/**
 * Pushes price and availability for every product that carries a foodpanda
 * SKU. Deliberately scoped to price + active: the Add Products endpoint is
 * documented as BETA and "do not use in production", so creating products on
 * foodpanda from here is not wired up. Products are created in the Partner
 * Portal, mapped by SKU, and kept in step from here.
 *
 * Asynchronous — foodpanda answers 202 with a job id and the outcome arrives
 * on the catalog webhook, so the job is recorded for the merchant to follow.
 */
export async function syncFoodpandaCatalog(accountId: string): Promise<SyncCatalogResult> {
  const storeResult = await getAuthorizedStoreId("courier.add");
  if (!storeResult.ok) return { success: false, error: storeResult.error };
  const storeId = storeResult.storeId;

  const accountResult = await getFoodpandaAccount(accountId, storeId);
  if (!accountResult.ok) return { success: false, error: accountResult.error };
  const a = accountResult.account;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, foodpanda_sku, base_price, discounted_price, status")
    .eq("store_id", storeId)
    .not("foodpanda_sku", "is", null);

  if (error) {
    console.error("foodpanda catalog sync could not read products:", error);
    return { success: false, error: "Could not read your products" };
  }

  const mapped = (products ?? []).filter((p) => p.foodpanda_sku);
  if (mapped.length === 0) {
    return {
      success: false,
      error: "No products have a foodpanda SKU yet — add one on a product to include it in the sync",
    };
  }

  // Send the price a customer actually pays: discounted_price when one is
  // set, base_price otherwise. Sending base_price while the storefront shows
  // a discount would list the item dearer on foodpanda than on the store's
  // own site. `status` is 'active' / 'inactive' here, not a boolean.
  const payload = mapped.map((p) => ({
    sku: p.foodpanda_sku as string,
    price: String(p.discounted_price ?? p.base_price ?? 0),
    active: p.status === "active",
  }));

  const result = await updateCatalogProducts(a.auth, a.chainId, a.vendorId, payload);
  if (!result.ok) return { success: false, error: result.error };

  const jobId = result.data?.job_id;
  if (jobId) {
    const { error: jobError } = await supabaseAdmin.from("foodpanda_catalog_jobs").insert({
      store_id: storeId,
      account_id: a.id,
      job_id: jobId,
      job_type: "update",
      status: result.data?.job_status ?? "QUEUED",
      product_count: payload.length,
    });
    if (jobError) console.error("Could not record foodpanda catalog job:", jobError);
  }

  return { success: true, jobId, productCount: payload.length };
}

export interface CatalogJobRow {
  id: string;
  jobId: string;
  jobType: string;
  status: string;
  productCount: number;
  downloadUrl: string | null;
  createdAt: string;
}

/** Recent catalog sync jobs, newest first — the merchant's record of what synced. */
export async function getFoodpandaCatalogJobs(accountId: string): Promise<CatalogJobRow[]> {
  const storeResult = await getAuthorizedStoreId("courier.view");
  if (!storeResult.ok) return [];

  const { data } = await supabaseAdmin
    .from("foodpanda_catalog_jobs")
    .select("id, job_id, job_type, status, product_count, download_url, created_at")
    .eq("store_id", storeResult.storeId)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((r) => ({
    id: r.id,
    jobId: r.job_id,
    jobType: r.job_type,
    status: r.status,
    productCount: r.product_count,
    downloadUrl: r.download_url,
    createdAt: r.created_at,
  }));
}
