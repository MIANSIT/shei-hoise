---
name: db-migration
description: Add or apply a database migration for Shei Hoise (self-hosted Supabase). Use whenever a task needs a new column, table, index, constraint or RPC — including adding a field to products, orders, stores or any other table — or when a query fails with "column does not exist". Covers the migration file convention, how migrations actually reach production, and the ordering rule that keeps the storefront from breaking.
---

# Database migrations

Supabase is **self-hosted** on the production VPS. There is no `supabase link`,
no managed dashboard doing this for you, and `.env.local` holds only
`NEXT_PUBLIC_SUPABASE_URL`, the anon key and the service-role key — **no
Postgres connection string**. Nothing applies migrations automatically.

## Writing one

Add a file to `supabase/migrations/` named `YYYYMMDDHHMMSS_short_description.sql`
(match the existing files — plain timestamp prefix, snake_case name), then
mirror the change into `schema.sql`, which is kept in sync by hand as the
readable reference.

Make changes additive and idempotent wherever possible:

```sql
ALTER TABLE "public"."products"
  ADD COLUMN IF NOT EXISTS "free_delivery" boolean DEFAULT false NOT NULL;
```

A nullable column, or one with a default, lets existing rows and running code
carry on untouched. Prefer that to anything requiring a backfill window.

## Applying it — this does not happen by itself

Migrations must be run manually against the production database. Two routes:

1. **Supabase Studio → SQL Editor** on the self-hosted instance. Quickest.
2. **`psql` on the VPS** — see the `deploy` skill for how to get in.

Local development also points at the production instance
(`NEXT_PUBLIC_SUPABASE_URL=https://api.sheihoise.com`), so **there is no
separate local database to test against**. A migration applied for local work
is applied for everyone. Treat every migration as a production change.

## The ordering rule

> **Never ship code that selects a new column before the migration is applied.**

PostgREST fails the *entire* select when one column is unknown, so a single
unapplied column takes down every screen using that query — not just the new
feature. This has already happened: a `free_delivery` column was added to the
codebase, the code shipped selecting it, and the product edit page, product
list and cart all threw `column products.free_delivery does not exist` until
the SQL was run.

Safe order:

1. Write the migration file.
2. **Apply it to the database.**
3. Merge and deploy the code that reads or writes the column.

Because migrations are additive with defaults, step 2 is safe to do ahead of
step 3 — the old code simply ignores the new column.

## Threading a new field through the app

A column is rarely enough on its own. For a product field, the full path is:

- `supabase/migrations/…sql` and `schema.sql`
- Zod schema — `src/lib/schema/productSchema.ts` and `productUpdateSchema.ts`
  (and `varientSchema.ts` if variants carry it)
- Write path — `createProduct.ts`, `updateProduct.ts`
- Read paths — `getProductBySlug.ts` (admin edit form),
  `getProductsWithVariants.ts` (dashboard list **and** the cart),
  `getClientProductBySlug.ts` (storefront product page)
- Types — `src/lib/types/cart.ts` if it must survive into the cart
- UI — form field, table column, storefront display
- Both languages in `src/lib/i18n/translations.ts` (see the `brand-copy` skill)

Bundles are rows in `products` with `product_type = 'bundle'`, so a product
column already exists for bundles — no second migration, and product-level
helpers like `toggleProductFreeDelivery` work on them directly.

## Gotchas

- **`undefined` silently skips a column.** supabase-js serialises the update as
  JSON, and `JSON.stringify` drops undefined keys — so an update that means
  "clear this" must send `null`, not `undefined`, or the old value survives and
  looks like a save that did nothing.
- **PostgREST caps responses at 1000 rows** (`PGRST_DB_MAX_ROWS`), silently. Any
  query that legitimately needs the whole set must use
  `src/lib/queries/utils/fetchAllPaged.ts`.
- **Always scope by `store_id`.** This is a multi-tenant database; a query
  without that filter is a cross-tenant data leak.
- Verify after applying, and say what you actually ran — do not report a
  migration as applied when only the file was written.