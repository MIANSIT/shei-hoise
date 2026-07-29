# Shei Hoise — How the App Functions (Post-Containerization)

This describes how Shei Hoise actually runs now that it's fully containerized (see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for what the product does, and [docker/README.md](docker/README.md) for the exhaustive Docker reference — env vars, bootstrap ordering, VPS cutover checklist).

## The short version

Nothing about the application code changed. What changed is *how the backend it talks to is hosted*: instead of the app calling Vercel-hosted Next.js + Supabase Cloud, everything — the app and its own self-hosted copy of Supabase — now runs as a set of Docker containers on one machine, all wired together through a single gateway. The exact same containers are meant to run on the eventual production VPS.

## The moving pieces

```
Browser
  │
  ├──────────────────────────────► shei-hoise-app  (Next.js, :3000)
  │                                     │
  │                                     │  supabase-js client, one base URL
  │                                     ▼
  └──────────────────────────────► shei-hoise-kong (API gateway, :8000)
                                        │
                    ┌───────────────────┼────────────────────┬───────────────┐
                    ▼                   ▼                    ▼               ▼
              shei-hoise-auth    shei-hoise-rest      shei-hoise-storage   shei-hoise-studio
              (GoTrue)           (PostgREST)          (Storage API)       (admin dashboard)
                    │                   │                    │                    │
                    └───────────────────┴────────┬───────────┘                   │
                                                  ▼                               ▼
                                          shei-hoise-db                   shei-hoise-meta
                                          (Postgres 17)                   (postgres-meta,
                                                                           powers Studio)
                                                  │
                                          shei-hoise-storage also writes files to:
                                                  ▼
                                          shei-hoise-minio  (local stand-in for Cloudflare R2)
```

Every one of these is a separate Docker container, defined in `docker/docker-compose.yml`. None of it is Vercel or Supabase Cloud anymore in the local/VPS setup — it's the same open-source components Supabase Cloud itself is built from, self-hosted.

## What each piece actually does

- **`app` (Next.js)** — the storefronts, the merchant dashboard, and all the `/api/*` routes (pixel events, Pathao webhooks, invoices, etc.). Built as a Docker image via `docker/Dockerfile` using Next's `output: "standalone"` mode — a slim, self-contained bundle rather than a full `node_modules` tree.
- **`kong` (API gateway)** — the single door everything goes through. The app's Supabase client is configured with exactly one URL (`NEXT_PUBLIC_SUPABASE_URL`, pointing at Kong), and Kong internally routes `/auth/*` → GoTrue, `/rest/*` → PostgREST, `/storage/*` → Storage API, everything else → Studio. This is exactly how Supabase Cloud's own edge works, just running locally.
- **`auth` (GoTrue)** — issues and verifies the JWTs behind every login/session. Same auth flow the app already used against Supabase Cloud; only the backing service moved.
- **`rest` (PostgREST)** — auto-generates the REST API the app's `supabase-js` `.from(...)` calls hit. It enforces the same Row-Level Security policies that live in Postgres, unchanged.
- **`storage` (Storage API)** — backs every product photo, store logo, and store banner. It's configured in **S3 mode**, currently pointed at the `minio` container; on the VPS this same configuration points at Cloudflare R2 instead — the app never knows the difference.
- **`db` (Postgres 17)** — the actual database, running Supabase's own Postgres image (not vanilla Postgres) so it has the extensions and internal schemas Auth/Storage/REST expect.
- **`studio` + `meta`** — the admin dashboard for browsing tables and running SQL directly, reachable at `http://localhost:8000` through Kong (basic-auth protected).
- **`minio`** — a local, S3-compatible object store standing in for Cloudflare R2, so the storage code path is genuinely exercised locally instead of silently using a different (disk-based) mode that wouldn't catch R2-specific issues later.

## How a request actually flows

1. A merchant opens the dashboard or a customer opens a storefront → hits `shei-hoise-app` on port 3000.
2. The app's Supabase client (browser or server-side) calls `http://localhost:8000/...` (Kong).
3. Kong authenticates the request (API key / JWT), then forwards it to the right backend — `auth`, `rest`, or `storage` — over Docker's internal network.
4. `auth`/`rest`/`storage` talk to `db` (Postgres) to do the actual work, enforcing RLS the whole way.
5. For file uploads/downloads, `storage` additionally talks to `minio` (or R2, on the VPS) to actually store/retrieve the bytes; Postgres only tracks bucket/object metadata.
6. The response comes back through Kong to the app, same as it always did against Supabase Cloud.

## Build-time vs runtime configuration — the one real gotcha

Next.js bakes every `NEXT_PUBLIC_*` environment variable into the compiled JavaScript **at `docker build` time**, not at container startup. So:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` are passed as Docker **build arguments** (see `docker-compose.yml`'s `app.build.args`), sourced from the same `docker/.env` as everything else.
- A couple of *non-public* env vars (`UPSTASH_REDIS_REST_URL`/`TOKEN`) also had to become build args, because `src/lib/redis/redis.ts` constructs its client the moment the module is imported, not lazily — so even a build-time static analysis pass needs a real-looking value.
- Everything else (`SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `GMAIL_*`, `ADMIN_API_URL`, Pathao/Meta secrets) is read lazily inside request handlers, so those are supplied at container **runtime** via `environment:` — changing them just needs a container restart, not a rebuild.

Practical consequence: moving from local → VPS means rebuilding the `app` image (because the Kong URL and keys differ), but the database, auth, and storage containers need no rebuild at all — just a fresh `docker/.env`.

## The schema: two sources, not one

`supabase/migrations/` (35 tracked files) does **not** reconstruct the database from an empty Postgres by itself — a handful of core tables (like `store_settings`) were created through a one-time manual project migration years ago, before this repo's migration history started being tracked. The actual from-scratch bootstrap (`docker/scripts/apply-migrations.sh`) does two things in order:

1. Load `schema.sql` (a full schema snapshot as of 2026-07-09) — this brings in everything the tracked migrations alone would miss.
2. Replay every migration in `supabase/migrations` on top. They're all written defensively (`IF NOT EXISTS`/`IF EXISTS` throughout), so anything already reflected in `schema.sql` just no-ops, and anything added after 2026-07-09 (courier tracking, vendor tables, product bundles, dashboard summaries, etc.) actually applies.

This is a one-time step per fresh database (local, and later the VPS) — not something that runs on every app deploy.

## What's genuinely different from before, and what isn't

**Unchanged:** every line of application code, every API route, every RLS policy, every Meta Pixel/Pathao integration, the entire UI. The app still talks to "a Supabase project" through `supabase-js` exactly as it always did.

**Changed:** where that Supabase project lives. It's no longer Supabase's managed cloud infrastructure — it's the same open-source Postgres/GoTrue/PostgREST/Storage stack, running in Docker containers, with Kong as the front door. Locally that's for testing; the same containers, same compose file, are the intended production setup on the VPS from the migration playbook, with only secrets/domain/storage-endpoint values differing.
