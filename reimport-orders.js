/**
 * Rebuild every Pawfect-BD order from the Sales tab.
 *
 * Supersedes the first pass, which only imported the 104 rows that had
 * something in the invoice column — and took "Tanvir" / "Ayesa" at face value
 * as order numbers. This imports all 511 sale rows and guarantees every order
 * carries a real PAWF-YYMMDD-XXXXX number.
 *
 * Grouping: rows sharing a valid invoice number are one order — that is what an
 * invoice means, and those numbers exist on paper. Every other row becomes its
 * own order, because without an invoice number there is nothing asserting that
 * two rows belong to the same sale.
 *
 * --dry (default) prints the plan; --execute writes.
 */
const XLSX = require("xlsx");
const crypto = require("crypto");
const fs = require("fs");

const STORE_ID = "dd6f5e3d-cda5-47bd-a094-943d5e75cc30";
const EXECUTE = process.argv.includes("--execute");
const VALID_INVOICE = /^PAWF-\d{6}-[0-9A-F]{5}$/i;

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };

async function rest(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const excelDate = (s) =>
  typeof s === "number" ? new Date(Math.round((s - 25569) * 86400 * 1000)) : new Date();
const ymd = (d) => d.toISOString().slice(0, 10);

/**
 * PAWF-YYMMDD-XXXXX, matching the app's own format. The suffix is derived from
 * the group key rather than random, so re-running produces identical numbers
 * instead of a second set of duplicate orders.
 */
function generateInvoice(date, key, taken) {
  const d = ymd(date).slice(2).replace(/-/g, "");
  let hash = crypto.createHash("sha1").update(key).digest("hex").toUpperCase();
  for (let i = 0; i + 5 <= hash.length; i++) {
    const candidate = `PAWF-${d}-${hash.slice(i, i + 5)}`;
    if (!taken.has(candidate)) { taken.add(candidate); return candidate; }
  }
  throw new Error(`could not generate a unique invoice for ${key}`);
}

const wb = XLSX.readFile("PawfectBD Business Tracker.xlsx");
const rows = XLSX.utils
  .sheet_to_json(wb.Sheets["Sales"], { header: 1, defval: null, blankrows: false })
  .slice(5)
  .filter((r) => r[5] || r[11] || r[3]);

/* Per-invoice delivery charges live on the Orders tab (online orders only). */
const delivery = new Map();
XLSX.utils.sheet_to_json(wb.Sheets["Orders"], { header: 1, defval: null, blankrows: false })
  .slice(4)
  .filter((r) => r[0] && String(r[0]).startsWith("PAWF"))
  .forEach((r) => delivery.set(String(r[0]).trim(), Number(r[7]) || 0));

/* ── Group rows into orders ──────────────────────────────────────── */
const groups = new Map();
for (const [rowIndex, r] of rows.entries()) {
  const raw = r[4] ? String(r[4]).trim() : "";
  const realInvoice = VALID_INVOICE.test(raw) ? raw.toUpperCase() : null;
  const date = excelDate(r[0]);
  const customer = String(r[3] || "").trim() || "PawfectBD Shop";
  const channel = String(r[2] || "Shop").trim();
  // No valid invoice number means no evidence that this row shares a sale with
  // any other, so it stands alone. `rowIndex` keeps the key unique per row.
  const key = realInvoice || `GEN|${rowIndex}|${ymd(date)}|${customer}|${channel}`;

  if (!groups.has(key)) {
    groups.set(key, { key, realInvoice, date, customer, channel, paid: true, lines: [] });
  }
  const g = groups.get(key);
  // "Due" on any line makes the whole order outstanding.
  if (String(r[12] || "").trim().toLowerCase() === "due") g.paid = false;
  g.lines.push({
    sku: String(r[5] || "").trim(),
    name: String(r[6] || "").trim(),
    qty: Number(r[7]) || 0,
    unit: Number(r[8]) || 0,
    total: Number(r[11]) || 0,
    type: String(r[1] || "Sale").trim(),
  });
}

const taken = new Set([...groups.values()].filter((g) => g.realInvoice).map((g) => g.realInvoice));
for (const g of groups.values()) {
  g.order_number = g.realInvoice || generateInvoice(g.date, g.key, taken);
}

async function main() {
  const products = await rest(`products?store_id=eq.${STORE_ID}&select=id,sku`);
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));
  const existing = await rest(`orders?store_id=eq.${STORE_ID}&select=id,order_number`);
  const links = await rest(`store_customer_links?store_id=eq.${STORE_ID}&select=customer_id`);
  const custRows = links.length
    ? await rest(`store_customers?id=in.(${links.map((l) => l.customer_id).join(",")})&select=id,name`)
    : [];
  const custByName = new Map(custRows.filter((c) => c.name).map((c) => [c.name.trim().toLowerCase(), c.id]));

  const all = [...groups.values()];
  const matched = all.filter((g) => custByName.has(g.customer.toLowerCase()));
  const unmatched = all.filter((g) => !custByName.has(g.customer.toLowerCase()));
  const missingSku = new Set();
  all.forEach((g) => g.lines.forEach((l) => { if (l.sku && !skuToId.has(l.sku)) missingSku.add(l.sku); }));

  console.log("═══ PLAN ═══════════════════════════════════════════");
  console.log(`DELETE  existing orders     ${existing.length}  (${existing.filter((o) => !VALID_INVOICE.test(o.order_number)).length} with bogus numbers)`);
  console.log(`CREATE  orders              ${all.length}`);
  console.log(`  keeping real invoice no.  ${all.filter((g) => g.realInvoice).length}`);
  console.log(`  generated invoice no.     ${all.filter((g) => !g.realInvoice).length}`);
  console.log(`CREATE  order_items         ${all.reduce((s, g) => s + g.lines.length, 0)}`);
  console.log(`CUSTOMERS  matched by name  ${matched.length} orders · fallback to shop ${unmatched.length} orders`);
  if (unmatched.length) console.log(`  unmatched names: ${[...new Set(unmatched.map((g) => g.customer))].join(", ")}`);
  console.log(`SKUs in sales not in catalogue: ${missingSku.size}${missingSku.size ? " → " + [...missingSku].slice(0, 5).join(", ") : ""}`);
  console.log(`NET value  ৳${all.reduce((s, g) => s + g.lines.reduce((t, l) => t + l.total, 0), 0).toFixed(2)}`);
  console.log("\nGenerated examples:");
  all.filter((g) => !g.realInvoice).slice(0, 3).forEach((g) =>
    console.log(`  ${g.order_number}  ${ymd(g.date)}  ${g.customer.padEnd(24)} ${g.lines.length} line(s)`));

  if (!EXECUTE) { console.log("\nDRY RUN — nothing written. Re-run with --execute."); return; }

  console.log("\n═══ EXECUTING ══════════════════════════════════════");
  await rest(`orders?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`✓ deleted ${existing.length} existing orders`);

  // Shop fallback: one customer record standing in for counter sales.
  let shopId = custByName.get("pawfectbd shop");
  if (!shopId) {
    const [c] = await rest("store_customers", { method: "POST", body: JSON.stringify({ name: "PawfectBD Shop", is_active: true }) });
    await rest("store_customer_links", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: c.id, store_id: STORE_ID }) });
    shopId = c.id;
    custByName.set("pawfectbd shop", shopId);
  }

  let n = 0, items = 0;
  for (const g of all) {
    const subtotal = g.lines.reduce((s, l) => s + l.total, 0);
    const ship = delivery.get(g.order_number) || 0;
    const [order] = await rest("orders", {
      method: "POST",
      body: JSON.stringify({
        store_id: STORE_ID,
        order_number: g.order_number,
        customer_id: custByName.get(g.customer.toLowerCase()) || shopId,
        status: g.paid ? "delivered" : "confirmed",
        payment_status: g.paid ? "paid" : "pending",
        payment_method: "cod",
        subtotal,
        tax_amount: 0,
        shipping_fee: ship,
        total_amount: subtotal + ship,
        currency: "BDT",
        shipping_address: {
          customer_name: g.customer,
          address: `${g.channel} sale — imported from business tracker`,
          source: "xlsx-import",
        },
        created_at: g.date.toISOString(),
      }),
    });
    await rest("order_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(g.lines.map((l) => ({
        order_id: order.id,
        product_id: skuToId.get(l.sku) || null,
        product_name: l.name || l.sku || "Item",
        quantity: l.qty,
        unit_price: l.unit,
        total_price: l.total,
      }))),
    });
    n++; items += g.lines.length;
    if (n % 50 === 0) console.log(`  … ${n}/${all.length}`);
  }
  console.log(`✓ created ${n} orders, ${items} order items`);
}

main().catch((e) => { console.error("\n✗ FAILED:", e.message); process.exit(1); });
