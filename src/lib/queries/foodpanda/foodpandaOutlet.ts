"use server";

import { getAuthorizedStoreId } from "@/lib/permissions/server";
import { getFoodpandaAccount } from "@/lib/utils/getFoodpandaAccount";
import {
  getOutletStatus,
  setOutletStatus,
  type FoodpandaOutletStatus,
} from "@/lib/utils/foodpandaApi";

export interface OutletStatusResult {
  success: boolean;
  error?: string;
  status?: string;
  closedReason?: string;
  closedUntil?: string;
}

/** Reads whether the vendor is currently taking orders on foodpanda. */
export async function readFoodpandaOutletStatus(accountId: string): Promise<OutletStatusResult> {
  const storeResult = await getAuthorizedStoreId("courier.view");
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const accountResult = await getFoodpandaAccount(accountId, storeResult.storeId);
  if (!accountResult.ok) return { success: false, error: accountResult.error };
  const a = accountResult.account;

  const result = await getOutletStatus(a.auth, a.chainId, a.vendorId);
  if (!result.ok) return { success: false, error: result.error };

  return {
    success: true,
    status: result.data?.status,
    closedReason: result.data?.closed_reason,
    closedUntil: result.data?.closed_until,
  };
}

/**
 * Opens or closes the outlet. Closing is how a merchant stops foodpanda
 * sending orders they cannot fulfil — the single most time-critical control
 * in this integration, which is why it sits on the page rather than behind a
 * settings screen.
 */
export async function writeFoodpandaOutletStatus(
  accountId: string,
  status: FoodpandaOutletStatus,
  options: { closedReason?: string; closedUntil?: string } = {},
): Promise<OutletStatusResult> {
  const storeResult = await getAuthorizedStoreId("courier.add");
  if (!storeResult.ok) return { success: false, error: storeResult.error };

  const accountResult = await getFoodpandaAccount(accountId, storeResult.storeId);
  if (!accountResult.ok) return { success: false, error: accountResult.error };
  const a = accountResult.account;

  const result = await setOutletStatus(a.auth, a.chainId, a.vendorId, status, options);
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, status };
}
