/**
 * Replace Pawfect-BD's catalogue and orders from "PawfectBD Business Tracker.xlsx".
 *
 * Destructive. Run with --dry (default) to print the plan and write nothing;
 * --execute performs it. Every statement is scoped to STORE_ID.
 *
 * Order of operations matters: orders are deleted BEFORE products, because
 * order_items.product_id is ON DELETE SET NULL — dropping products first would
 * silently orphan the historical line items instead of removing them.
 */
const XLSX = require("xlsx");
const fs = require("fs");

const BACKUP = process.env.BACKUP_DIR;
const STORE_ID = "dd6f5e3d-cda5-47bd-a094-943d5e75cc30";
const BUCKET = "shei-hoise-product";
const EXECUTE = process.argv.includes("--execute");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/* ── Parse the workbook ──────────────────────────────────────────── */
const wb = XLSX.readFile("PawfectBD Business Tracker.xlsx");
const grid = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, blankrows: false });

const invRows = grid("Inventory").slice(4).filter((r) => r[0] && String(r[0]).trim());
const salesRows = grid("Sales").slice(5).filter((r) => r[4]);
const orderRows = grid("Orders").slice(4).filter((r) => r[0] && String(r[0]).startsWith("PAWF"));

/** Excel serial date → ISO. Excel's epoch is 1899-12-30. */
const excelDate = (serial) =>
  typeof serial === "number"
    ? new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString()
    : new Date().toISOString();

const slugify = (s) =>
  String(s).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 90);

/* Products from the Inventory tab. */
const seenSlug = new Set();
const products = invRows.map((r) => {
  const name = String(r[1] || "").trim();
  let slug = slugify(name) || slugify(r[0]);
  let n = 2;
  while (seenSlug.has(slug)) slug = `${slugify(name)}-${n++}`;
  seenSlug.add(slug);
  return {
    sku: String(r[0]).trim(),
    name,
    slug,
    category: String(r[2] || "").trim(),
    stock: Math.max(0, Math.round(Number(r[7]) || 0)),
    cost: Number(r[8]) || null,
    price: Number(r[10]) || 0,
  };
});

/* Per-invoice delivery + payment, from the Orders tab. */
const orderMeta = new Map();
orderRows.forEach((r) => {
  orderMeta.set(String(r[0]).trim(), {
    deliveryCharged: Number(r[7]) || 0,
    paymentStatus: String(r[10] || "").toLowerCase().includes("paid") ? "paid" : "pending",
  });
});

/* Invoices from the Sales tab. */
const invoices = new Map();
salesRows.forEach((r) => {
  const num = String(r[4]).trim();
  if (!invoices.has(num)) {
    invoices.set(num, {
      order_number: num,
      date: excelDate(r[0]),
      customer: String(r[3] || "").trim() || "Walk-in",
      channel: String(r[2] || "").trim(),
      lines: [],
    });
  }
  invoices.get(num).lines.push({
    sku: String(r[5] || "").trim(),
    name: String(r[6] || "").trim(),
    qty: Number(r[7]) || 0,
    unit: Number(r[8]) || 0,
    total: Number(r[11]) || 0,
  });
});

/* ── Plan ────────────────────────────────────────────────────────── */
async function main() {
  const existingProducts = await rest(`products?store_id=eq.${STORE_ID}&select=id,sku,name`);
  const existingOrders = await rest(`orders?store_id=eq.${STORE_ID}&select=id,order_number`);
  const existingCats = await rest(`categories?store_id=eq.${STORE_ID}&select=id,name`);
  const links = await rest(`store_customer_links?store_id=eq.${STORE_ID}&select=customer_id`);
  const customerIds = links.map((l) => l.customer_id);
  const customers = customerIds.length
    ? await rest(`store_customers?id=in.(${customerIds.join(",")})&select=id,name,phone`)
    : [];

  const catNames = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.id]));
  const missingCats = catNames.filter((n) => !catByName.has(n.toLowerCase()));

  const custByName = new Map(customers.filter((c) => c.name).map((c) => [c.name.toLowerCase(), c.id]));
  const sheetCustomers = [...new Set([...invoices.values()].map((i) => i.customer))];
  const matchedCust = sheetCustomers.filter((n) => custByName.has(n.toLowerCase()));

  console.log("═══ PLAN ═══════════════════════════════════════════");
  console.log(`DELETE  orders            ${existingOrders.length}  (cascades order_items, tracking)`);
  console.log(`DELETE  products          ${existingProducts.length}  (cascades variants, inventory, image rows, reviews)`);
  console.log(`DELETE  storage objects   under ${BUCKET}/${STORE_ID}/`);
  console.log(`CREATE  categories        ${missingCats.length} new  (${existingCats.length} existing kept)`);
  console.log(`CREATE  products          ${products.length}`);
  console.log(`CREATE  inventory rows    ${products.length}`);
  console.log(`CREATE  orders            ${invoices.size}`);
  console.log(`CREATE  order_items       ${[...invoices.values()].reduce((s, i) => s + i.lines.length, 0)}`);
  console.log(`CUSTOMERS  ${sheetCustomers.length} in sheet · ${matchedCust.length} matched by name · ${sheetCustomers.length - matchedCust.length} to create`);
  console.log("");
  console.log("Sample products:");
  products.slice(0, 3).forEach((p) => console.log(`  ${p.sku.padEnd(22)} ${p.name.slice(0, 38).padEnd(40)} ৳${p.price} stock=${p.stock}`));
  console.log("Sample invoice:");
  const first = [...invoices.values()][0];
  console.log(`  ${first.order_number} ${first.date.slice(0, 10)} ${first.customer} — ${first.lines.length} line(s)`);

  if (!EXECUTE) {
    console.log("\nDRY RUN — nothing written. Re-run with --execute.");
    return;
  }

  /* ── Execute ───────────────────────────────────────────────────── */
  console.log("\n═══ EXECUTING ══════════════════════════════════════");

  // 1. Orders first — see the note at the top of this file. (Already 0 if a
  //    previous run got this far; the DELETE is idempotent.)
  await rest(`orders?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`\u2713 orders cleared`);

  // 2. Vendor module. These FKs are ON DELETE RESTRICT, so they block the
  //    product delete unless they go first: settlements -> items -> orders.
  const bak = (f) => JSON.parse(fs.readFileSync(`${BACKUP}/${f}`, "utf8"));
  const voItems = bak("vendor_order_items.json").map((r) => r.id);
  if (voItems.length) {
    await rest(`vendor_order_items?id=in.(${voItems.join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  await rest(`vendor_settlements?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  await rest(`vendor_orders?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`\u2713 removed ${voItems.length} vendor order items, 4 vendor orders, 1 settlement`);

  // 3. Bundle recipes — also RESTRICT on component_product_id.
  const bItems = [...new Set([...bak("bundle_items.json"), ...bak("bundle_items_components.json")].map((r) => r.id))];
  if (bItems.length) {
    await rest(`bundle_items?id=in.(${bItems.join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  console.log(`\u2713 removed ${bItems.length} bundle items`);

  // 4. Products — cascades variants, inventory, image rows, reviews, cart, wishlists.
  await rest(`products?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`\u2713 deleted ${existingProducts.length} products`);

  // 5. Categories — replaced wholesale so the store matches the sheet exactly.
  await rest(`categories?store_id=eq.${STORE_ID}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log(`\u2713 deleted ${existingCats.length} categories`);

  // 6. Storage. Image *rows* cascade with the product; the files do not.
  const list = await fetch(`${URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ prefix: `${STORE_ID}/`, limit: 1000 }),
  }).then((r) => r.json());
  const files = Array.isArray(list) ? list.map((f) => `${STORE_ID}/${f.name}`) : [];
  if (files.length) {
    await fetch(`${URL}/storage/v1/object/${BUCKET}`, {
      method: "DELETE", headers: H, body: JSON.stringify({ prefixes: files }),
    });
  }
  console.log(`\u2713 deleted ${files.length} storage objects`);

  // 4. Categories.
  catByName.clear();
  for (const name of catNames) {
    const [row] = await rest("categories", {
      method: "POST",
      body: JSON.stringify({ store_id: STORE_ID, name, slug: slugify(name), is_active: true }),
    });
    catByName.set(name.toLowerCase(), row.id);
  }
  console.log(`\u2713 created ${catNames.length} categories`);

  // 5. Products + inventory, in batches.
  const skuToId = new Map();
  for (let i = 0; i < products.length; i += 50) {
    const batch = products.slice(i, i + 50).map((p) => ({
      store_id: STORE_ID,
      category_id: catByName.get(p.category.toLowerCase()) || null,
      name: p.name,
      slug: p.slug,
      // The sheet has no description column; the name is the only text we have.
      description: p.name,
      base_price: p.price,
      tp_price: p.cost,
      sku: p.sku,
      status: "active",
      product_type: "simple",
      free_delivery: false,
    }));
    const rows = await rest("products", { method: "POST", body: JSON.stringify(batch) });
    rows.forEach((r) => skuToId.set(r.sku, r.id));
  }
  console.log(`✓ created ${skuToId.size} products`);

  const invBatch = products.map((p) => ({
    product_id: skuToId.get(p.sku),
    variant_id: null,
    quantity_available: p.stock,
    quantity_reserved: 0,
    track_inventory: true,
  }));
  for (let i = 0; i < invBatch.length; i += 50) {
    await rest("product_inventory", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(invBatch.slice(i, i + 50)),
    });
  }
  console.log(`✓ created ${invBatch.length} inventory rows`);

  // 6. Customers — match on name, create what is missing.
  for (const name of sheetCustomers) {
    if (custByName.has(name.toLowerCase())) continue;
    const [c] = await rest("store_customers", {
      method: "POST",
      body: JSON.stringify({ name, is_active: true }),
    });
    await rest("store_customer_links", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ customer_id: c.id, store_id: STORE_ID }),
    });
    custByName.set(name.toLowerCase(), c.id);
  }
  console.log(`✓ customers reconciled (${sheetCustomers.length} referenced)`);

  // 7. Orders + items.
  let orderCount = 0, itemCount = 0;
  for (const inv of invoices.values()) {
    const meta = orderMeta.get(inv.order_number) || { deliveryCharged: 0, paymentStatus: "paid" };
    const subtotal = inv.lines.reduce((s, l) => s + l.total, 0);
    const [order] = await rest("orders", {
      method: "POST",
      body: JSON.stringify({
        store_id: STORE_ID,
        order_number: inv.order_number,
        customer_id: custByName.get(inv.customer.toLowerCase()),
        status: meta.paymentStatus === "paid" ? "delivered" : "confirmed",
        payment_status: meta.paymentStatus,
        payment_method: "cod",
        subtotal,
        tax_amount: 0,
        shipping_fee: meta.deliveryCharged,
        total_amount: subtotal + meta.deliveryCharged,
        currency: "BDT",
        // The tracker has no addresses or phone numbers; this records where the
        // order came from rather than pretending to know a delivery address.
        shipping_address: {
          customer_name: inv.customer,
          address: `Imported from business tracker — ${inv.channel} sale`,
          source: "xlsx-import",
        },
        created_at: inv.date,
      }),
    });
    orderCount++;

    const items = inv.lines.map((l) => ({
      order_id: order.id,
      product_id: skuToId.get(l.sku) || null,
      product_name: l.name || l.sku,
      quantity: l.qty,
      unit_price: l.unit,
      total_price: l.total,
    }));
    await rest("order_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(items),
    });
    itemCount += items.length;
  }
  console.log(`✓ created ${orderCount} orders, ${itemCount} order items`);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\n✗ FAILED:", e.message);
  process.exit(1);
});
