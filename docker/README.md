# Shei Hoise — Docker stack

A trimmed copy of Supabase's official self-hosted Docker Compose stack (Postgres,
GoTrue/Auth, PostgREST, Storage API, Kong, Studio, postgres-meta) plus the Next.js
app and MinIO (a local stand-in for Cloudflare R2). This is the same setup meant
to run on the VPS later — see "Local → VPS" below for exactly what changes.

Omitted, all confirmed unused by this app: Realtime, imgproxy, Edge Functions,
Analytics/Logflare, Supavisor (pooler).

## First-time setup

1. Copy the env template and fill in real values:
   ```
   cp docker/.env.example docker/.env
   ```
2. Generate secrets (JWT secret, ANON/SERVICE_ROLE keys, Postgres password, etc.):
   ```
   cd docker && ./scripts/generate-keys.sh --update-env && cd ..
   ```
   This fills in the `docker/.env` secret block. Fill in the remaining app-specific
   values (`GMAIL_*`, `UPSTASH_*`, `ENCRYPTION_KEY`, etc.) yourself — same values
   as your existing `.env.local`, or dev placeholders if you don't need those
   integrations working locally yet.
3. Bring the whole stack up in the correct order:
   ```
   ./docker/scripts/bootstrap.sh
   ```
   This is required on first boot because GoTrue and Storage-API create their own
   `auth`/`storage` Postgres schemas on startup — our 35 existing migrations
   reference `auth.users` and `auth.uid()`, so they must run *after* those
   services finish self-migrating, not before. `bootstrap.sh` handles that
   ordering: `db` → `auth`/`storage`/`rest`/`minio` → our migrations → storage
   buckets → `kong`/`studio`/`meta`/`app`.

After first-time setup, day-to-day use is just:
```
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
```

## Verifying it actually works

- Sign in through the app's real login flow at `http://localhost:3000` — confirms
  GoTrue is reachable through Kong and issuing valid sessions.
- Load a public storefront page — confirms PostgREST + RLS policies (which call
  `auth.uid()`) are working against the migrated schema.
- Open Studio at `http://localhost:8000` (basic-auth from `DASHBOARD_USERNAME`/
  `DASHBOARD_PASSWORD` in `docker/.env`) and browse the Table Editor — confirms
  `meta` is wired correctly.
- Upload a store logo/banner or product image through the admin UI, confirm the
  returned public URL loads, then check it landed in MinIO at
  `http://localhost:9001` (console login: `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`).
  This is the part that de-risks the later R2 cutover — Storage-API's S3-mode
  code path is what's actually being exercised here, not its local-disk mode.
- `curl -X POST http://localhost:3000/api/pixel-event -H 'content-type: application/json' -d '...'`
  — expect the DB write to succeed; the outbound Meta Conversions API call will
  fail locally without a real token, which is expected.

Deliberately **not** testable locally (VPS-time only): real Pathao/Meta
credentials, live Pathao webhook delivery (needs a public HTTPS URL), a real
domain, a real R2 bucket, TLS.

## Local → VPS: what actually changes

Only `docker/.env` values, plus a rebuild of the `app` image with the VPS's
build args. `docker-compose.yml`, `volumes/api/kong.yml`, and the DB init scripts
stay identical:

| Changes on the VPS | Stays identical |
|---|---|
| Fresh `JWT_SECRET`/`ANON_KEY`/`SERVICE_ROLE_KEY`/`POSTGRES_PASSWORD`/`DASHBOARD_PASSWORD` (never reuse local dev secrets) | `docker-compose.yml` (services, images, healthchecks, dependency graph) |
| `SITE_URL`, `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL` → real domain | `volumes/api/kong.yml`, `kong-entrypoint.sh` |
| `GLOBAL_S3_ENDPOINT`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`REGION` → real R2 values (drop the `minio`/`minio-createbucket` services) | `volumes/db/{roles,jwt,webhooks}.sql` |
| `db`'s port binding tightened to `127.0.0.1:5432:5432` or removed (use an SSH tunnel for migrations) | `Dockerfile` |
| Real `ADMIN_API_URL`, `GMAIL_*`, `UPSTASH_*`, `ENCRYPTION_KEY`, real Pathao/Meta secrets in the app's own settings | `scripts/bootstrap.sh`, `apply-migrations.sh`, `create-buckets.sh` (same flow, run once against the fresh VPS Postgres) |
| A reverse proxy in front of Kong for TLS (nginx/Caddy — an *additional* compose file, not a change to this one) | Bucket names (`store_logo`, `store-banner`, `shei-hoise-product`) and their public config |
| Rebuild `app` with VPS `NEXT_PUBLIC_*` build-args (baked in at `next build` time — see Dockerfile comments) | Everything about how the app talks to Supabase (one Kong URL, same client code) |

## Notes

- `supabase/migrations` does **not** reconstruct the schema from scratch —
  core tables like `store_settings` were introduced through a manual project
  migration at some point, not a tracked CLI migration, and only live in
  `schema.sql` (a schema-only snapshot as of 2026-07-09). `apply-migrations.sh`
  therefore loads `schema.sql` first, then replays `supabase/migrations` on
  top — every migration in that folder is written idempotently (`IF NOT
  EXISTS`/`IF EXISTS` throughout), so ones already reflected in schema.sql's
  snapshot no-op and everything added after 2026-07-09 applies for real. Two
  migrations (`20260707120000`, `20260707160000`) do a bare `RENAME` /
  backfill-from-already-dropped-columns that isn't safely re-runnable — the
  script marks those two as applied via `supabase migration repair` instead of
  executing them, since schema.sql already has their effect. Don't replay
  anything under `migration_dump/` — those are one-time cross-project
  migration scripts (with real data, up to 45MB) from a past Supabase project
  move, not a general-purpose bootstrap path.
- Supabase's own "buckets" (`store_logo`, `store-banner`, `shei-hoise-product`)
  are key-prefixes inside **one** `GLOBAL_S3_BUCKET`, not three separate S3
  buckets — so the VPS needs one R2 bucket total, not three.
- The Supabase CLI's Postgres driver defaults to attempting SSL against
  `--db-url` connections; against this stack's plain-TCP Postgres it hard-fails
  with "server refused TLS connection" unless `PGSSLMODE=disable` is set as an
  environment variable (putting `sslmode=disable` in the URL itself is
  silently ignored by the CLI).
