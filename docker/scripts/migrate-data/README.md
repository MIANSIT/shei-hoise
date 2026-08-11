# Cloud → self-hosted data migration

One-time tooling to pull the current Supabase Cloud project's real data (auth
users, every public-schema table, storage files) into a self-hosted stack
(local "prod" rehearsal today, later the VPS). Not part of the regular
dev/prod bring-up — run this once against a freshly-bootstrapped target.

Builds on the same approach already used in `migration_dump/` for a prior
cloud-to-cloud project migration (`migrate-auth.mjs`/`migrate-storage.mjs` are
already generic over any source/destination pair). These are separate copies
with their own mapping file (`auth-id-mapping.json` in this directory) so
`migration_dump/auth-id-mapping.json` — which documents that prior migration —
is never touched.

## Prerequisites

- The target stack's schema must already be bootstrapped: `apply-migrations.sh`
  and `create-buckets.sh` already run against it (empty tables, real schema).
- Three secrets, none of which are stored anywhere in this repo:
  - `OLD_URL` — the source project's API URL (e.g. `https://<ref>.supabase.co`)
  - `OLD_KEY` — the source project's `service_role` key
  - `SOURCE_DB_URL` — a **direct Postgres connection string** to the source
    project (Supabase dashboard → Project Settings → Database → Connection
    string). This is different from `OLD_URL`/`OLD_KEY` — those are the REST/Auth
    API, this is the actual `postgresql://...` connection `pg_dump` needs.

## Order (matters)

1. **`migrate-auth.mjs`** — recreates every user in the target via the GoTrue
   Admin API. Passwords can't be carried over (not exposed by any API) — users
   get a random password and must use "Forgot Password". Builds
   `auth-id-mapping.json` (old user id → new user id).
2. **`migrate-public-data.sh`** — `pg_dump --data-only --schema=public` from
   the source, `pg_restore` into the target (run inside the `shei-hoise-db`
   container, no client tools needed on the host). Copies every table's rows
   as-is, still referencing the OLD auth user ids and the OLD storage hostname.
3. **`fix-image-urls.sh`** — rewrites the source project's hostname to the
   target's storage hostname in every stored image/avatar URL
   (`product_images.image_url`, `stores.logo_url`/`banner_url`,
   `categories.image_url`, `customer_profiles.avatar_url`,
   `user_profiles.avatar_url`) — same pattern as
   `supabase/migrations/20260715000000_fix_dead_supabase_project_image_urls.sql`,
   which was written to be reusable for exactly this kind of cutover. Storage-API
   keeps the same `/storage/v1/object/public/<bucket>/<path>` URL shape whether
   self-hosted or cloud, so this is a pure hostname swap.
4. **`fix-auth-id-references.mjs`** — walks `auth-id-mapping.json` and updates
   `store_customers.auth_user_id` / `store_subscriptions.user_id` to the new ids.
5. **`migrate-storage.mjs`** — copies every bucket's files from source to target.

Run them individually, or all at once:

```
OLD_URL='https://<source-ref>.supabase.co' \
OLD_KEY='<source service_role key>' \
SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' \
docker/scripts/migrate-data/run-all.sh prod
```

(`prod` targets `docker/.env.prod` for the destination URL/key; omit it — or
pass `dev` — to target the dev stack instead, e.g. for a dry run against
disposable MinIO-backed storage first.)

## Notes

- `auth.users` is deliberately **not** included in the `pg_dump`/`pg_restore`
  step — copying it directly would carry over bcrypt hashes in a way that
  isn't portable across different GoTrue versions/instances, which is exactly
  the problem step 1 solves properly (at the cost of a forced password reset).
- All five scripts are safe to re-run (idempotent): `migrate-auth.mjs` skips
  users already in the mapping file, `migrate-public-data.sh`'s restore will
  conflict on already-inserted primary keys if re-run against a
  partially-migrated target (re-run against a clean/rolled-back target
  instead), `fix-image-urls.sh` and `fix-auth-id-references.mjs` only touch
  rows still holding the old value, and `migrate-storage.mjs` uploads with
  `upsert: true`.
- Real customer PII moves through these scripts (emails, phone numbers,
  order/address data). Treat `SOURCE_DB_URL` and `OLD_KEY` like any other
  production credential — don't commit them, don't paste them into shared
  chat/logs.
