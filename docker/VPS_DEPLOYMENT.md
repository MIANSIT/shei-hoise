# Deploying to a real VPS

This moves the **current local "prod" rehearsal** — already-migrated data (105
auth users, 13 stores, 329 products, 823 orders) and storage files already
living in the real Cloudflare R2 bucket — onto an actual internet-reachable
server. It is a **clone** of the working local database, not a re-run of the
Supabase-Cloud migration in `docker/scripts/migrate-data/`.

Read `docker/README.md` first for the dev/prod architecture this builds on.

## 0. Prerequisites

- A real domain, with access to add DNS records.
- `docker/.env.prod` on this machine already has correct, working values
  (R2 credentials verified, `ENCRYPTION_KEY` set) — confirm with
  `docker compose -f docker/docker-compose.yml --env-file docker/.env.prod ps`
  showing everything healthy before starting.

## 1. Provision the VPS

Per the original migration playbook: a Hetzner CPX22 (2 vCPU/4GB, Singapore
region) or equivalent is enough for this workload.

- Create the server, SSH key auth only (disable password auth).
- `ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable`.
- Install Docker Engine + the Compose plugin.
- Create a non-root user in the `docker` group for day-to-day deploys.

## 2. DNS

Two records, both pointed at the VPS's IP — the browser calls Kong directly
(`NEXT_PUBLIC_SUPABASE_URL`), not just the app, so both need their own public
HTTPS hostname:

| Record | Points to |
|---|---|
| `sheihoise.com` (A) | app |
| `api.sheihoise.com` (A) | Kong |

Let DNS propagate before step 8 (Caddy) — Let's Encrypt issuance fails if the
domain doesn't resolve to the VPS yet.

## 3. Copy the repo to the VPS

```
rsync -av --exclude node_modules --exclude .next --exclude docker/volumes/db/data \
  --exclude docker/volumes/db/data-prod \
  . deploy@<vps-ip>:/opt/shei-hoise/
```

## 4. Build `docker/.env.prod` for the VPS

Start from this machine's working `docker/.env.prod` and change only what
must change:

- **Regenerate fresh** (never reuse local-rehearsal values):
  `JWT_SECRET`, `POSTGRES_PASSWORD`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
  `DASHBOARD_PASSWORD` — run `./docker/scripts/generate-keys-for.sh docker/.env.prod`
  on the VPS copy.
- **Copy byte-for-byte from local, do NOT regenerate**:
  `ENCRYPTION_KEY`, `ENCRYPTION_KEY_VERSION`, `GLOBAL_S3_BUCKET`,
  `GLOBAL_S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `REGION`, `S3_PROTOCOL_ACCESS_KEY_ID`, `S3_PROTOCOL_ACCESS_KEY_SECRET`.
  `ENCRYPTION_KEY` encrypts *data already stored* in the database being
  cloned — a new key silently breaks decryption for every store's saved
  Pathao/Meta credentials, not just the 3 already known to be affected. The
  R2 values must stay identical because the restored database's image URLs
  already point at that exact bucket.
- **New real values**:
  `SITE_URL=https://sheihoise.com`,
  `SUPABASE_PUBLIC_URL=https://api.sheihoise.com`,
  `API_EXTERNAL_URL=https://api.sheihoise.com/auth/v1`,
  `SITE_DOMAIN=sheihoise.com`, `API_DOMAIN=api.sheihoise.com`,
  `POSTGRES_DATA_DIR=./volumes/db/data` (fresh path on the VPS — no dev/prod
  split needed there, only one environment runs),
  `ADMIN_API_URL=https://sheihoise.com`.
- **Tighten**: don't publish Postgres's port at all on the VPS (remove/comment
  the `${POSTGRES_PORT}:5432` mapping in `docker-compose.yml`'s `db` service,
  or bind it to `127.0.0.1` — use an SSH tunnel for any ad-hoc `psql`/dump
  access instead).
- **Fill in for full functionality** if not already real: `GMAIL_*`,
  `UPSTASH_REDIS_REST_URL/TOKEN`. Real per-store Pathao/Meta credentials are
  unaffected by the move — they live in the database being cloned.

## 5. Dump the local database

On this machine:
```
./docker/scripts/migrate-data/dump-local-prod-db.sh
scp docker/full-prod.dump deploy@<vps-ip>:/opt/shei-hoise/docker/
```

## 6. Bring up Postgres on the VPS and restore

```
cd /opt/shei-hoise
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml \
  --env-file docker/.env.prod up -d db
# wait for healthy:
docker compose -f docker/docker-compose.yml --env-file docker/.env.prod ps

docker exec -i shei-hoise-db pg_restore -U postgres -d postgres < docker/full-prod.dump
```
This must happen against an **empty** `docker/volumes/db/data` — restoring
onto a fresh data directory before Auth/Storage ever start is what lets them
find their expected schema already in place (same `supabase/postgres`
image, same GoTrue/Storage-API versions, as confirmed by `docker-compose.yml`
being unchanged) and just start, with no self-migration conflicts.

## 7. Bring up Auth, REST, Storage

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml \
  --env-file docker/.env.prod up -d auth rest storage
```
Watch `docker compose logs -f auth storage` — expect clean startup against
the already-populated schema, not fresh migrations running.

## 8. Bring up Studio, postgres-meta, Kong

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml \
  --env-file docker/.env.prod up -d studio meta kong
```

## 9. Bring up Caddy (after DNS has propagated)

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml \
  --env-file docker/.env.prod up -d caddy
docker compose ... logs -f caddy
```
Confirm both certs issue successfully (`sheihoise.com` and `api.sheihoise.com`)
before moving on.

## 10. Rebuild and start the app

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml \
  --env-file docker/.env.prod up -d --build app
```
`NEXT_PUBLIC_*` values are baked in at build time from `docker/.env.prod`'s
new real-domain values — this is why a rebuild (not just a restart) is
required whenever those change.

## 11. Post-deploy config

- GoTrue's `ADDITIONAL_REDIRECT_URLS` and the password-reset system's
  `NEXT_PUBLIC_SITE_URL` now point at the real domain automatically (both
  come from `docker/.env.prod`) — no separate dashboard config needed, unlike
  the old Supabase Cloud setup.
- Re-register the Pathao webhook URL with Pathao if it was previously
  registered against a different host (`https://sheihoise.com/api/pathao/webhook/<credentialId>`,
  see `src/app/api/pathao/webhook/[credentialId]/route.ts`).

## Verification

1. `docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod ps` — everything healthy.
2. `curl -I https://api.sheihoise.com/auth/v1/health` and `curl -I https://sheihoise.com/` — valid certs, 200s.
3. Sign in as a real migrated store owner at `https://sheihoise.com/admin-login` — the most important check, since this is exactly the class of bug (`public.users` id sync, see `docker/scripts/migrate-data/fix-public-users-ids.sh`) that was found and fixed locally.
4. Load a real storefront page and confirm product images render — served straight from R2, no local dependency at all.
5. Request a password reset through the real UI end-to-end and confirm the emailed link uses the real domain.
6. Confirm the Pathao webhook endpoint is genuinely reachable now that a public HTTPS URL exists.

## If something goes wrong

- `db` won't come up clean / restore errors: confirm `docker/volumes/db/data`
  was actually empty before `up -d db` (check `docker/README.md`'s note on
  why dev/prod need separate data directories — the same principle applies
  here: Postgres only initializes on an empty directory).
- Caddy cert issuance fails: almost always DNS hasn't propagated yet, or
  ports 80/443 aren't reachable (check `ufw status`). Caddy retries
  automatically once DNS resolves.
- App can't reach Supabase server-side: confirm `SUPABASE_INTERNAL_URL:
  http://kong:8000` is still set in `docker-compose.yml`'s `app` service
  environment (it should be, unchanged from local) — this is what lets
  server components/middleware/`supabaseAdmin` reach Kong over the Docker
  network rather than the public `SUPABASE_PUBLIC_URL`.
