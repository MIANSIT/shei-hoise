import { NextRequest } from "next/server";
import { getCustomerOrderHistory } from "@/lib/queries/orders/getCustomerOrderHistory";

/**
 * Prior order history for a batch of phone numbers, for the status tags on the
 * orders table and the edit-order page.
 *
 * Batched like /api/orders/risk-levels: the orders table asks once per page
 * rather than once per row.
 *
 * `storeId` is required and every lookup is scoped to it — history from another
 * shop must never surface here.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, phones } = await req.json();

    if (typeof storeId !== "string" || !storeId) {
      return Response.json({ error: "storeId is required" }, { status: 400 });
    }
    if (!Array.isArray(phones)) {
      return Response.json(
        { error: "phones must be an array" },
        { status: 400 },
      );
    }

    const history = await getCustomerOrderHistory(storeId, phones);
    return Response.json(history, { status: 200 });
  } catch (error) {
    console.error("[customer-history] failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
