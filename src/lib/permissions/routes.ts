/**
 * Which permission a staff member needs to open each dashboard page.
 * "owner" means owner-only (never grantable to a role).
 *
 * Matched by longest prefix, so "/dashboard/orders/quick-sale/audit" wins
 * over "/dashboard/orders". "/dashboard" itself only matches exactly.
 * Any dashboard route not listed here is owner-only, so a page added later
 * stays closed to staff until someone decides who should see it.
 */
export type RouteRequirement = string | "owner";

const ROUTE_REQUIREMENTS: ReadonlyArray<readonly [string, RouteRequirement]> = [
  ["/dashboard/change-password", "any"],
  ["/dashboard/no-access", "any"],

  ["/dashboard/staff", "owner"],
  ["/dashboard/branches", "owner"],
  ["/dashboard/stock-transfers", "transfers.view"],
  ["/dashboard/activity", "activity.view"],

  ["/dashboard/orders/quick-sale/audit", "register.view"],
  ["/dashboard/orders/quick-sale", "pos.view"],
  ["/dashboard/orders/create-order", "orders.add"],
  ["/dashboard/orders/edit-order", "orders.edit"],
  ["/dashboard/orders", "orders.view"],

  ["/dashboard/customers/create-customer", "customers.add"],
  ["/dashboard/customers/dues", "customers.view"],
  ["/dashboard/customers", "customers.view"],

  ["/dashboard/products/add-product", "products.add"],
  ["/dashboard/products/edit-product", "products.edit"],
  ["/dashboard/products/bundles/add-bundle", "products.add"],
  ["/dashboard/products/bundles/edit-bundle", "products.edit"],
  ["/dashboard/products/bundles", "products.view"],
  ["/dashboard/products/category", "categories.view"],
  ["/dashboard/products/stocks-update", "stock.view"],
  ["/dashboard/products", "products.view"],

  ["/dashboard/reviews", "reviews.view"],
  ["/dashboard/reports", "reports.view"],
  ["/dashboard/marketing/coupons", "coupons.view"],

  ["/dashboard/expense", "expenses.view"],

  ["/dashboard/vendors", "vendors.view"],
  ["/dashboard/vendor-orders/create", "vendors.add"],
  ["/dashboard/vendor-orders", "vendors.view"],
  ["/dashboard/vendor-settlements", "vendors.view"],

  ["/dashboard/cod-settlements", "cod.view"],
  ["/dashboard/courier/pathao", "courier.view"],
  ["/dashboard/courier/steadfast", "courier.view"],
  ["/dashboard/courier/paperfly", "courier.view"],
  ["/dashboard/courier/manual", "courier.view"],

  ["/dashboard/storefront-design", "storefront.view"],
  ["/dashboard/hero-slides", "storefront.view"],
  ["/dashboard/promo-banners", "storefront.view"],
  ["/dashboard/announcements", "storefront.view"],
];

/** Requirement for a pathname: a permission string, "owner", or "any" (every signed-in dashboard user). */
export function routeRequirement(pathname: string): RouteRequirement {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return "dashboard.view";

  let best: readonly [string, RouteRequirement] | null = null;
  for (const entry of ROUTE_REQUIREMENTS) {
    const [prefix] = entry;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = entry;
    }
  }
  return best ? best[1] : "owner";
}

/** Pages a staff member is sent to when /dashboard itself isn't allowed, in order of preference. */
export const STAFF_LANDING_ORDER: ReadonlyArray<readonly [string, string]> = [
  ["/dashboard/orders/quick-sale", "pos.view"],
  ["/dashboard/orders", "orders.view"],
  ["/dashboard/products/stocks-update", "stock.view"],
  ["/dashboard/products", "products.view"],
  ["/dashboard/customers/dues", "customers.view"],
  ["/dashboard/expense", "expenses.view"],
  ["/dashboard/vendors", "vendors.view"],
  ["/dashboard/reports/sales", "reports.view"],
];
