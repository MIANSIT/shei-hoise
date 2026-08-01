# Shei Hoise — Docker stack

A trimmed copy of Supabase's official self-hosted Docker Compose stack (Postgres,
GoTrue/Auth, PostgREST, Storage API, Kong, Studio, postgres-meta) plus the Next.js
app. `docker-compose.yml` is the shared, production-shaped base — `storage`
talks to real Cloudflare R2 by default. Two thin layers on top of it give you
dev and prod:

| | Compose files | Env file | Storage backend | Postgres data dir |
|---|---|---|---|---|
| **dev** | `docker-compose.yml` + `docker-compose.dev.yml` | `docker/.env` | local MinIO (added by the dev overlay) | `docker/volumes/db/data` |
| **prod** | `docker-compose.yml` only | `docker/.env.prod` | real Cloudflare R2 | `docker/volumes/db/data-prod` |

Dev and prod use separate Postgres data directories (`POSTGRES_DATA_DIR` in
each env file) — Postgres only runs its init scripts (roles/JWT secret) on an
*empty* data directory, so sharing one between environments with different
`POSTGRES_PASSWORD`/`JWT_SECRET` values would leave the running Postgres still
keyed to whichever environment initialized it first.

"prod" here means the same self-hosted stack running with production-grade
settings and (optionally) real migrated data — it runs **locally, on this
machine, for now**, as a rehearsal before an actual VPS exists. Moving it to a
real VPS later changes only `docker/.env.prod`'s URLs (see "Local → VPS" below)
— not the compose files.

Omitted vs. the official Supabase stack, all confirmed unused by this app:
Realtime, imgproxy, Edge Functions, Analytics/Logflare, Supavisor (pooler).

Every script under `docker/scripts/` takes an optional `dev`/`prod` argument
(default: `dev`) and picks the right compose files + env file accordingly.

**Note:** dev and prod share container names and host ports (same
`docker-compose.yml`) — only one of them can run at a time. Stop one
(`docker compose -f docker-compose.yml [-f docker-compose.dev.yml] down`)
before starting the other.

## First-time setup — dev

1. Copy the env template and fill in real values:
   ```
   cp docker/.env.example docker/.env
   ```
2. Generate secrets (JWT secret, ANON/SERVICE_ROLE keys, Postgres password, etc.):
   ```
   ./docker/scripts/generate-keys-for.sh docker/.env
   ```
   Fill in the remaining app-specific values (`GMAIL_*`, `UPSTASH_*`,
   `ENCRYPTION_KEY`, etc.) yourself — same values as your existing
   `.env.local`, or dev placeholders if you don't need those integrations
   working locally yet.
3. Bring the whole stack up in the correct order:
   ```
   ./docker/scripts/bootstrap.sh dev
   ```
   This is required on first boot because GoTrue and Storage-API create their
   own `auth`/`storage` Postgres schemas on startup — our migrations reference
   `auth.users` and `auth.uid()`, so they must run *after* those services
   finish self-migrating, not before. `bootstrap.sh` handles that ordering:
   `db` → `auth`/`storage`/`rest`/`minio` → schema/migrations → storage
   buckets → `kong`/`studio`/`meta`/`app`.

After first-time setup, day-to-day use is just:
```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --env-file docker/.env up -d
```

## First-time setup — prod (rehearsal)

Same shape, different files, plus a real Cloudflare R2 bucket:

1. In the Cloudflare dashboard, create an R2 bucket and an API token (Access
   Key ID + Secret Access Key) if you haven't already, and note your account ID.
2. Copy the prod env template and fill it in:
   ```
   cp docker/.env.prod.example docker/.env.prod
   ./docker/scripts/generate-keys-for.sh docker/.env.prod
   ```
   Fill in the R2 section (`GLOBAL_S3_BUCKET`, `GLOBAL_S3_ENDPOINT`,
   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and the app-specific values.
   **Every secret in `docker/.env.prod` must be different from `docker/.env`
   (dev)** — never reuse dev secrets here.
3. Bring the stack up:
   ```
   ./docker/scripts/bootstrap.sh prod
   ```
   Same ordering as dev, minus the MinIO step — `storage` talks to R2 directly.
4. (Optional, once) Migrate the current Supabase Cloud data in — see
   `docker/scripts/migrate-data/README.md`. This is a separate, deliberate step
   with its own safety notes (real customer PII moves through it) — not part
   of the regular bring-up.

## Verifying it actually works

- Sign in through the app's real login flow at `http://localhost:3000` — confirms
  GoTrue is reachable through Kong and issuing valid sessions.
- Load a public storefront page — confirms PostgREST + RLS policies (which call
  `auth.uid()`) are working against the migrated schema.
- Open Studio at `http://localhost:8000` (basic-auth from `DASHBOARD_USERNAME`/
  `DASHBOARD_PASSWORD` in the env file you're targeting) and browse the Table
  Editor — confirms `meta` is wired correctly.
- Upload a store logo/banner or product image through the admin UI, confirm the
  returned public URL loads, then check it actually landed in storage:
  - dev: MinIO console at `http://localhost:9001` (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`)
  - prod: the Cloudflare R2 bucket dashboard
- `curl -X POST http://localhost:3000/api/pixel-event -H 'content-type: application/json' -d '...'`
  — expect the DB write to succeed; the outbound Meta Conversions API call will
  fail without a real token, which is expected unless you've configured one.

Deliberately **not** testable until an actual VPS/domain exists: live Pathao
webhook delivery (needs a public HTTPS URL), TLS.

## Local → VPS: what actually changes

Once an actual VPS exists, only `docker/.env.prod` values change, plus a
rebuild of the `app` image with the VPS's build args. `docker-compose.yml`,
`volumes/api/kong.yml`, and the DB init scripts stay identical:

| Changes on the VPS | Stays identical |
|---|---|
| Fresh `JWT_SECRET`/`ANON_KEY`/`SERVICE_ROLE_KEY`/`POSTGRES_PASSWORD`/`DASHBOARD_PASSWORD` (never reuse the local-rehearsal prod secrets either) | `docker-compose.yml` (services, images, healthchecks, dependency graph) |
| `SITE_URL`, `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL` → real domain instead of `localhost` | `volumes/api/kong.yml`, `kong-entrypoint.sh` |
| `db`'s port binding tightened to `127.0.0.1:5432:5432` or removed (use an SSH tunnel for migrations) | `volumes/db/{roles,jwt,webhooks}.sql` |
| Real `ADMIN_API_URL`, `GMAIL_*`, `UPSTASH_*`, `ENCRYPTION_KEY`, real Pathao/Meta secrets in the app's own settings | `Dockerfile` |
| A reverse proxy in front of Kong for TLS (nginx/Caddy — an *additional* compose file, not a change to this one) | `docker-compose.dev.yml` (still only used for local dev) |
| Rebuild `app` with the VPS's `NEXT_PUBLIC_*` build-args (baked in at `next build` time — see Dockerfile comments) | Bucket names, R2 config shape, everything about how the app talks to Supabase |

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
  executing them, since schema.sql already has their effect.
- Don't replay anything under `migration_dump/` directly — those are one-time
  cross-project migration scripts (with real data, up to 45MB) from a past
  Supabase project move, not a general-purpose bootstrap path.
  `docker/scripts/migrate-data/` is the current, purpose-built equivalent for
  bringing the live Cloud project's data into this stack.
- Supabase's own "buckets" (`store_logo`, `store-banner`, `shei-hoise-product`)
  are key-prefixes inside **one** `GLOBAL_S3_BUCKET`, not three separate S3/R2
  buckets — create one bucket total, not three.
- The Supabase CLI's Postgres driver defaults to attempting SSL against
  `--db-url` connections; against this stack's plain-TCP Postgres it hard-fails
  with "server refused TLS connection" unless `PGSSLMODE=disable` is set as an
  environment variable (putting `sslmode=disable` in the URL itself is
  silently ignored by the CLI).
- `generate-keys.sh` (vendored from the official Supabase repo) hardcodes
  `.env` as its target filename — `generate-keys-for.sh <path>` wraps it so it
  can update `docker/.env` or `docker/.env.prod` interchangeably.
