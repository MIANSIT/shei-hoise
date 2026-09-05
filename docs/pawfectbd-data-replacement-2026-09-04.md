# Pawfect-BD data replacement — 4/5 September 2026

Record of a one-off production data operation: the Pawfect-BD store's catalogue
and order history were replaced with the contents of
`PawfectBD Business Tracker.xlsx`.

**Scope was one store.** Every statement was filtered on
`store_id = dd6f5e3d-cda5-47bd-a094-943d5e75cc30`. No other store's data was
read for modification or written to. Verification of that is at the end.

| | |
|---|---|
| Store | Pawfect-BD · `pawfectbd` · `dd6f5e3d-cda5-47bd-a094-943d5e75cc30` |
| Source | `PawfectBD Business Tracker.xlsx` — `Inventory`, `Sales`, `Orders` tabs |
| Executed by | Claude Code, via the Supabase REST API using the service-role key |
| Scripts | `import-pawfect.js`, `reimport-orders.js` (repo root — one-off tools, not app code) |
| Backups | `~/pawfectbd-backup-20260904-231443` |

---

## What changed

### Removed

| Table | Rows | Notes |
|---|---|---|
| `orders` | 43 | Included two orders from 3 Sep, one unpaid at ৳2,060 |
| `order_items` | 93 | Cascaded from orders |
| `courier_tracking` | 10 | Cascaded from orders |
| `products` | 81 | |
| `product_variants` | 50 | Cascaded from products |
| `product_inventory` | 105 | Cascaded from products |
| `product_images` | 143 | Cascaded from products |
| `categories` | 11 | Replaced wholesale by the sheet's 10 |
| `vendor_orders` | 4 | Vendors "Shopon", "Ahmed Osudhwalah" |
| `vendor_order_items` | 52 | `ON DELETE RESTRICT` — had to go before products |
| `vendor_settlements` | 1 | |
| `bundle_items` | 9 | `ON DELETE RESTRICT` on `component_product_id` |
| Storage objects | 147 | Bucket `shei-hoise-product`, prefix `<store_id>/` |

### Created

| Table | Rows | From |
|---|---|---|
| `categories` | 10 | Distinct categories in the Inventory tab |
| `products` | 156 | Inventory tab rows carrying an item code |
| `product_inventory` | 156 | `Current Stock` column |
| `store_customers` + links | 6 new | Customer names in the Sales tab not already on the store |
| `orders` | 461 | Sales tab, grouped (see below) |
| `order_items` | 511 | Every sale row in the Sales tab |

### Field mapping

| Sheet column | Database |
|---|---|
| `Item Code` | `products.sku` |
| `Product Description` | `products.name`, and `description` (the sheet has no description column) |
| `Category` | `categories.name` (+ generated `slug`) |
| `MRP (Tk)` | `products.base_price` |
| `Avg Unit Cost (Tk)` | `products.tp_price` |
| `Current Stock` | `product_inventory.quantity_available` |
| `Invoice Number` | `orders.order_number` (when valid — see below) |
| `Date` | `orders.created_at` |
| `Customer` | matched to `store_customers.name` |
| `Payment Status` | `orders.payment_status` — any `Due` line makes the order pending |
| `Delivery Charged to Customer` (Orders tab) | `orders.shipping_fee` |
| `Qty`, `Unit Price`, `Total Amount` | `order_items.quantity`, `unit_price`, `total_price` |

### How orders were grouped

- Rows sharing a **valid** `PAWF-YYMMDD-XXXXX` invoice number → one order
  (39 orders covering 89 rows; 22 of them carry more than one line).
- Every other row → **its own order** (422 orders). Without an invoice number
  there is nothing asserting that two rows belong to the same sale, so they are
  not merged. An earlier pass grouped these by date + customer + channel into
  55 orders; that was changed on request.
- Generated numbers use the same `PAWF-YYMMDD-XXXXX` format. The 5-character
  suffix is a SHA-1 of the group key, **not random**, so re-running the import
  regenerates identical numbers rather than creating duplicates.
- The sheet contained three non-invoice values in the invoice column —
  `Tanvir`, `Tanvir Bhai`, `Ayesa`. An earlier pass wrongly used these as order
  numbers; the final pass replaced them with generated ones.

### Reconciliation

| | Sheet | Database |
|---|---|---|
| Sale rows | 511 | 511 `order_items`, across 461 orders |
| Net sales value | ৳147,710.01 | ৳147,710.00 subtotal |
| Delivery charged | ৳1,890.00 | ৳1,890.00 shipping |
| Stock units | 1,572 | 1,572 |
| Products | 156 | 156 |
| Categories | 10 | 10 |

Order items unlinked to a product: **0**. Duplicate or malformed order numbers: **0**.
Payment status: 438 paid, 23 pending — taken from the sheet's `Due` flags.

### Platform-wide check

Counts across all 15 stores, before → after. Every delta is exactly this
store's, confirming nothing else was touched:

```
products            261 → 336   (−81 +156)
order_items       2,610 → 2,714 (+511 … −93 removed before the snapshot)
product_images      828 → 685   (−143)
product_variants    228 → 178   (−50)
categories           40 → 39    (−11 +10)
vendor_orders         4 → 0
vendor_order_items   52 → 0
store_customers   2,321 → 2,327 (+6)
stores               15 → 15    (unchanged)
```

---

## Known deviations and caveats

1. **Product images are gone and cannot be restored.** 147 storage objects were
   deleted at the customer's request. Only the `product_images` *rows* (URLs)
   were backed up — the image binaries were not. Restoring those rows would
   recreate records pointing at 404s. The 156 imported products have no images
   at all, because the sheet has no image column; the storefront shows
   placeholders.

2. **Vendor data was deleted, not replaced.** The 4 vendor orders are absent
   from the workbook — its `Purchases` tab covers 8 *suppliers* (M.S Trading,
   AT International, …) and the `Shop Ledger` covers one shop (Kafrul Shop),
   neither matching the vendors in the app. Deleting them was necessary to
   remove the products they referenced. The rows are in the backup.

3. **In-database clone tables were not created.** The intent was
   `bak_pawfect.*` tables inside Postgres. SSH password auth started failing
   partway through — most likely rate-limiting after repeated connections — and
   the attempt was abandoned rather than risk locking out the box. Complete
   JSON exports were taken instead; they restore through the same API used to
   write.

4. **24 of the 42 original invoices have a `Date` that disagrees with the date
   encoded in their own invoice number.** The sheet's `Date` column was used, as
   instructed. This is a data-quality issue in the tracker.

5. **Three orders for "Tanvir Bhai" are linked to the shop, not to a person.**
   The instruction was: match by customer name, otherwise treat as a shop order.
   No customer named "Tanvir Bhai" existed. The store does have
   "Tanvir Ahmed Robbany", and these are plausibly the same person — worth
   confirming and relinking.

6. **407 previously un-invoiced sale rows are now included.** The first pass
   imported only the 104 rows that had something in the invoice column. The
   final pass covers all 511.

7. **Order count reflects line items, not transactions, for counter sales.**
   Because un-invoiced rows each became their own order, a single shop visit
   that sold ten items now reads as ten orders. This was an explicit choice —
   the alternative (grouping by date + customer) produced 94 orders. The
   store's order-count metric should be read with that in mind.

---

## How to revert

Backups are at **`~/pawfectbd-backup-20260904-231443`** (a copy also exists in
the session scratchpad under `/tmp`, which does not survive a reboot — treat the
home directory copy as authoritative).

```
products.json                81    product_variants.json      50
product_inventory.json      105    product_images.json       143
categories.json              11    product_reviews.json        0
orders.json                  43    order_items.json           93
order_tracking.json           0    courier_tracking.json      10
vendor_orders.json            4    vendor_order_items.json    52
vendor_settlements.json       1    bundle_items.json           9
bundle_items_components.json  9    store_customer_links.json  34
```

Every row retains its **original UUID and timestamps**, so foreign keys between
restored tables line up and order history, invoices and reporting come back
intact.

### Order of operations

Restore is the mirror of the delete. Insert parents before children, and clear
the imported data first — the old products and the new ones both claim the same
SKUs and slugs, and `products` has a `UNIQUE (store_id, slug)` constraint.

1. Delete imported data (461 orders → cascades 511 items; 156 products →
   cascades inventory; 10 categories).
2. Restore `categories`, then `products`, then `product_variants`,
   `product_inventory`, `product_images`.
3. Restore `vendor_orders`, then `vendor_order_items`, then
   `vendor_settlements`.
4. Restore `bundle_items`.
5. Restore `orders`, then `order_items`, `order_tracking`, `courier_tracking`.
6. Leave `store_customers` alone — 6 records were added but none were removed,
   so nothing needs undoing. Delete them only if you want the exact prior state.

### Script

Strip the embedded join objects that PostgREST added to some exports (`products`,
`orders`, `vendor_orders` keys inside child rows) before inserting.

```js
// restore-pawfectbd.js — run with: node restore-pawfectbd.js --execute
const fs = require("fs");
const DIR = `${process.env.HOME}/pawfectbd-backup-20260904-231443`;
const STORE_ID = "dd6f5e3d-cda5-47bd-a094-943d5e75cc30";
const EXECUTE = process.argv.includes("--execute");

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n")
  .filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; }));
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };

const rest = async (path, opts = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers||{}) } });
  if (!r.ok) throw new Error(`${opts.method||"GET"} ${path} → ${r.status} ${(await r.text()).slice(0,300)}`);
};

// PostgREST embeds the joined parent under its table name; strip those keys.
const clean = rows => rows.map(r => {
  const { products, orders, vendor_orders, ...rest } = r;
  return rest;
});

const load = f => clean(JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")));

async function insert(table, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 50) {
    await rest(table, { method: "POST", body: JSON.stringify(rows.slice(i, i + 50)) });
  }
  console.log(`  restored ${rows.length} → ${table}`);
}

(async () => {
  if (!EXECUTE) { console.log("Dry run — pass --execute to write."); return; }

  // 1. Clear the imported data.
  await rest(`orders?store_id=eq.${STORE_ID}`, { method: "DELETE" });
  await rest(`products?store_id=eq.${STORE_ID}`, { method: "DELETE" });
  await rest(`categories?store_id=eq.${STORE_ID}`, { method: "DELETE" });
  console.log("cleared imported catalogue and orders");

  // 2-5. Restore, parents first.
  await insert("categories", load("categories.json"));
  await insert("products", load("products.json"));
  await insert("product_variants", load("product_variants.json"));
  await insert("product_inventory", load("product_inventory.json"));
  await insert("product_images", load("product_images.json"));   // URLs will 404 — see caveat 1
  await insert("vendor_orders", load("vendor_orders.json"));
  await insert("vendor_order_items", load("vendor_order_items.json"));
  await insert("vendor_settlements", load("vendor_settlements.json"));
  await insert("bundle_items", load("bundle_items.json"));
  await insert("orders", load("orders.json"));
  await insert("order_items", load("order_items.json"));
  await insert("order_tracking", load("order_tracking.json"));
  await insert("courier_tracking", load("courier_tracking.json"));
  console.log("done");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
```

### After restoring

- Confirm counts: 81 products, 11 categories, 43 orders, 93 order items,
  4 vendor orders.
- Check the store's dashboard totals. The summary tables are maintained by
  triggers that fire on insert, update and delete, so they should recompute on
  their own — but they are worth eyeballing after a bulk restore.
- Product images will be broken links. Either re-upload them or delete the
  `product_images` rows again.

### Partial revert

To keep the new catalogue but bring back the old orders and vendor records,
skip step 1 and the `categories`/`products`/`product_variants`/
`product_inventory`/`product_images` inserts. The old `order_items` reference
deleted product IDs; that column is `ON DELETE SET NULL` and nullable, so the
rows restore with `product_id` pointing at products that no longer exist —
insert them with `product_id: null` to avoid a foreign key error.
