import dayjs from "dayjs";
import { getStoreById } from "@/lib/queries/stores/getStoreById";
import { getVendorStatement } from "@/lib/queries/vendor/getVendorStatement";
import type { Vendor } from "@/lib/types/vendor/type";

/**
 * Builds a vendor's statement of account (invoices with their products, delivery charge and discount, returned goods,
 * payments, and the balance) and downloads it as a PDF.
 * @returns the balance due printed on the statement
 */
export async function downloadVendorStatement(
  vendor: Pick<Vendor, "id" | "name" | "phone" | "address">,
  storeId: string,
): Promise<number> {
  const [store, statement] = await Promise.all([getStoreById(storeId), getVendorStatement(vendor.id)]);

  const res = await fetch("/api/vendor-invoices/statement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store: {
        name: store?.store_name ?? "Store",
        address: store?.business_address,
        phone: store?.contact_phone,
        email: store?.contact_email,
      },
      vendor: { name: vendor.name, phone: vendor.phone, address: vendor.address },
      generatedDate: dayjs().format("DD-MM-YYYY"),
      statement,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate statement");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vendor_statement_${vendor.name.replace(/\s+/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  return statement.currentDue;
}
