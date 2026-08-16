# VPS → VPS migration runbook

Moves the running production stack from the current VPS (`70.153.137.14`) to a
new one (`165.99.219.4`), **keeping the same domain**. Read
`docker/VPS_DEPLOYMENT.md` first — this reuses its bring-up sequence and only
documents what differs when the source is a live server with real users rather
than a local rehearsal.

## What makes this move small

- **Storage doesn't move.** Objects live in Cloudflare R2, external to both
  servers. Both point at the same bucket with the same credentials, so there
  are zero files to copy — only Postgres moves.
- **The domain doesn't change.** Every stored image URL already says
  `https://api.sheihoise.com/...` and stays correct. Do **not** run
  `fix-image-urls.sh`. No rebuild is needed for URL reasons, no Pathao webhook
  re-registration, no Meta app changes.
- **The database is small.** Measured on the live box 2026-08-17: 163 MB,
  a 20 MB custom-format dump, holding 118 auth users, 13 stores, 250 products
  and 1711 orders. The dump/restore is seconds, so the write freeze is minutes.

## Connection facts (verified 2026-08-17)

| | Old | New |
|---|---|---|
| IP | `70.153.137.14` | `165.99.219.4` |
| SSH user | `azureuser` (Azure VM) | **TBD — key not yet authorized** |
| Repo path | `/home/azureuser/shei-hoise` | `/home/<user>/shei-hoise` |
| Key | `~/.ssh/shei-hoise-vps_key.pem` | same key must be added |
| Compose project | `shei-hoise` | `shei-hoise` |
| Caddy volume | `shei-hoise_caddy-data` | created at 5c |

Old box specs: 2 vCPU, 3.8 GB RAM, 2 GB swap already configured, 29 GB disk
(9.7 GB free).

## The one rule that governs the whole cutover

**The DNS change is not the cutover. Flipping the old box to a proxy is.**

If DNS changes while the old box still serves its own app and database, clients
that haven't picked up the new record place orders against the old database.
Those rows are lost when the old box is decommissioned. Turning the old box
into a pure proxy *first* means every request — old IP or new — reaches the
same database from that instant, and propagation becomes cosmetic.

## ⚠️ Where this contradicts VPS_DEPLOYMENT.md

`VPS_DEPLOYMENT.md` §4 says to **regenerate** `JWT_SECRET`, `ANON_KEY`,
`SERVICE_ROLE_KEY`, and `POSTGRES_PASSWORD`. That was correct for
local-rehearsal → VPS. **It is wrong here and would break production:**

- `ANON_KEY` is baked into the browser bundle at build time. Every visitor
  holding a cached bundle would send the old key to the new server and be
  rejected.
- `JWT_SECRET` signs live sessions. Regenerating it logs out every user at
  once and invalidates in-flight password-reset tokens.

For this migration, **copy every secret byte-for-byte** from the old
`docker/.env.prod`. The current values are in `docker/SERVICE_CREDENTIALS.md`
(gitignored).

---

# Part 2 — Pre-flight (T-48h)

**2a. Lower the DNS TTL.** Namecheap → Advanced DNS → both A records
(`sheihoise.com`, `api.sheihoise.com`, plus `www`) → TTL **300 seconds** (5
min). A TTL change only takes effect after the *previous* TTL expires, so this
must be done well ahead — it is the single highest-leverage step for shortening
the window where the two IPs disagree.

Verify what the current TTL is, so you know how long to wait:

```
dig +noall +answer sheihoise.com A
dig +noall +answer api.sheihoise.com A
```

The number before `IN A` is the remaining TTL in seconds.

**2b. Take an off-server backup.** On the OLD box:

```
cd /home/azureuser/shei-hoise
docker/scripts/migrate-data/dump-local-prod-db.sh
```

Then copy `docker/full-prod.dump` to your laptop — not just to the new server.
This is the rollback if anything goes wrong.

**2c. Inventory the secrets.** On the OLD box, `cat docker/.env.prod`. Keep it
open; Part 3 copies it verbatim.

---

# Part 3 — Build the new box (no traffic; old box untouched and still live)

**3a. Provision.** Docker Engine + Compose plugin, a non-root user in the
`docker` group, SSH key auth only, and:

```
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

Confirm resources before the first build — the image build is the peak memory
moment and takes ~7–8 minutes on 2 vCPU:

```
nproc && free -h && df -h /
```

If there is no swap, add 2–4 GB before building.

**3b. Copy the repo** (from your laptop, or `git clone`):

```
rsync -av --exclude node_modules --exclude .next \
  --exclude docker/volumes/db/data --exclude docker/volumes/db/data-prod \
  ./ azureuser@165.99.219.4:/home/azureuser/shei-hoise/
```

**3c. Copy `docker/.env.prod` verbatim** from the old box. Change **only**:

- `POSTGRES_DATA_DIR=./volumes/db/data`

Everything else — `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
`POSTGRES_PASSWORD`, `ENCRYPTION_KEY`, `STORAGE_TENANT_ID`, the whole R2 block,
`SITE_URL`, `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_DOMAIN`,
`API_DOMAIN` — stays identical. See the warning above.

**3d. Bring up Postgres alone, on an empty data directory:**

```
cd /home/azureuser/shei-hoise
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d db
```

Wait for `healthy`:

```
docker inspect -f '{{.State.Health.Status}}' shei-hoise-db
```

**3e. Restore the Part 2b dump** (the rehearsal load).

> ⚠️ **`VPS_DEPLOYMENT.md` and `dump-local-prod-db.sh` both document
> `pg_restore -U postgres`. That is wrong and silently loses every auth user.**
> Verified on the new box 2026-08-17: in `supabase/postgres:17.6.1.136`,
> `postgres` is **not** a superuser (`rolsuper = f`) and the `auth` / `storage`
> schemas are owned by `supabase_admin`. Restoring as `postgres` produces ~500
> "permission denied for schema auth" errors, and — because the image
> pre-creates `auth.users` with a *different* column set than the dump
> (`column "is_sso_user" ... does not exist`) — the `COPY` into `auth.users`
> fails while `public` and `storage` restore fine. The result looks like a
> successful migration with correct order and product counts, and **zero users
> able to log in**.

Two changes are required. Drop the image-created `auth` and `storage` schemas
first so the dump's own definitions win (safe here: `public` is still empty, so
the CASCADE has no foreign keys to take with it), then restore as
`supabase_admin`:

```
docker exec -i shei-hoise-db psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres <<'SQL'
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
SQL

docker exec -i shei-hoise-db pg_restore -U supabase_admin -d postgres < docker/full-prod.dump
```

This must happen on an **empty** PGDATA and **before** auth/storage start —
the dump carries GoTrue's own `auth.schema_migrations`, so those containers
boot into their expected schema instead of trying to self-migrate.

**Expect ~31 errors, all benign**: "schema ... already exists" for schemas the
image pre-creates (`vault`, `realtime`, `pgbouncer`, `graphql_public`,
`supabase_functions`), plus a duplicate-key `COPY` into `supabase_functions.migrations`.
Anything mentioning `permission denied` or `auth.users` means you restored as
the wrong role — wipe and redo.

**Always verify counts against the source before continuing:**

```
docker exec shei-hoise-db psql -U postgres -d postgres -tAc "
select 'auth.users='||(select count(*) from auth.users)
    ||' stores='||(select count(*) from public.stores)
    ||' products='||(select count(*) from public.products)
    ||' orders='||(select count(*) from public.orders)"
```

Baseline measured 2026-08-17: `auth.users=118 stores=13 products=250
orders=1716`. A zero user count is the failure mode above.

**3f. Bring up the rest — but not Caddy:**

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d auth rest storage meta kong studio
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d --build app
```

Watch `logs -f auth storage` for a clean start against the existing schema —
you should **not** see migrations running.

---

# Part 4 — Validate before any traffic moves

Caddy isn't running on the new box yet, so test by overriding DNS locally. On
**your laptop**, add to `/etc/hosts`:

```
165.99.219.4  sheihoise.com www.sheihoise.com api.sheihoise.com
```

TLS will warn until certs are copied (Part 5c) — that's expected at this stage;
use `curl -k` or accept the browser warning. Check:

- [ ] Storefront loads, product images render
- [ ] Sign in as a real migrated store owner (`/admin-login`) — this is the
      highest-value check; it exercises auth, JWT, and the `public.users` id
      linkage in one go
- [ ] Dashboard shows the expected order and product counts
- [ ] Upload a product image; confirm the stored URL is
      `https://api.sheihoise.com/...` with **no port**
- [ ] `docker logs shei-hoise-app` has no sharp native-module error

**Remove the `/etc/hosts` lines when done.** Leaving them in place means you
won't notice if the real DNS change fails.

---

# Part 5 — Cutover (maintenance window, ~10 minutes)

**5a. Freeze writes on the OLD box:**

```
cd /home/azureuser/shei-hoise
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod stop app
```

From here until 5e, the site is down. Everything below is minutes of work.

**5b. Final data sync.** On OLD:

```
docker/scripts/migrate-data/dump-local-prod-db.sh
scp docker/full-prod.dump azureuser@165.99.219.4:/home/azureuser/shei-hoise/docker/
```

On NEW — wipe and re-initialize, because Postgres only runs its init scripts on
an empty PGDATA and the rehearsal data must not be restored on top of:

```
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod down
sudo rm -rf docker/volumes/db/data
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d db
# wait for healthy, then:
docker exec -i shei-hoise-db pg_restore -U postgres -d postgres < docker/full-prod.dump
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d auth rest storage meta kong studio app
```

**5c. Copy the TLS certificates.** Let's Encrypt validates HTTP-01 by connecting
to whatever the domain currently resolves to — which is still the old box — so
the new box **cannot issue its own certs yet**. Certificates and the ACME
account key are portable files, so copy them.

On OLD:

```
docker run --rm -v shei-hoise_caddy-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/caddy-data.tgz -C /data .
scp caddy-data.tgz azureuser@165.99.219.4:/home/azureuser/shei-hoise/
```

On NEW:

```
docker volume create shei-hoise_caddy-data
docker run --rm -v shei-hoise_caddy-data:/data -v /home/azureuser/shei-hoise:/backup alpine \
  tar xzf /backup/caddy-data.tgz -C /data
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod up -d caddy
```

Verify the new box serves valid TLS for both hostnames before continuing:

```
curl -sI --resolve sheihoise.com:443:165.99.219.4 https://sheihoise.com/ | head -3
curl -sI --resolve api.sheihoise.com:443:165.99.219.4 https://api.sheihoise.com/auth/v1/health | head -3
```

Both must return 200 with no certificate error. **Do not proceed until they do**
— step 5d sends live traffic here.

**5d. Flip the old box to a proxy. This is the cutover.** On OLD:

```
cp docker/volumes/proxy/Caddyfile docker/volumes/proxy/Caddyfile.pre-migration
cp docker/volumes/proxy/Caddyfile.migration-proxy docker/volumes/proxy/Caddyfile
docker compose -f docker/docker-compose.yml -f docker/docker-compose.proxy.yml --env-file docker/.env.prod restart caddy
docker logs --tail 30 shei-hoise-caddy
```

The site is now live again, served by the new box's database through the old
box's proxy. **Verify before moving on** — this is where a mistake is silent:

```
curl -sI https://sheihoise.com/ | head -3
```

**5e. Point GitHub Actions at the new box.** Repo → Settings → Secrets →
`VPS_HOST` → `165.99.219.4`. Without this, the next merge to `main` rebuilds on
a box that is now only a proxy: the deploy reports success and changes nothing.

---

# Part 6 — DNS, then decommission

**6a.** Namecheap → both A records (and `www`) → `165.99.219.4`.

**6b. Watch propagation:**

```
dig +short sheihoise.com A
dig +short api.sheihoise.com A
```

**6c. Leave the old box proxying for at least 72h.** Some resolvers ignore low
TTLs, and Pathao holds webhook URLs pointed at whatever it last resolved. Watch
for traffic still arriving at the old box:

```
docker logs --since 1h shei-hoise-caddy | wc -l
```

Decommission only once that is effectively zero — and take a final off-server
dump first.

---

# Edge cases and how they present

| Symptom | Cause | Fix |
|---|---|---|
| Cert error at 5c | Volume name wrong, or tar restored a nested dir | `docker run --rm -v shei-hoise_caddy-data:/data alpine ls /data` — expect `caddy/`, not `data/` |
| Every user logged out after cutover | `JWT_SECRET` differs between boxes | Restore the old value in `.env.prod` on NEW, rebuild `app` |
| Storefront 401s from the browser | `ANON_KEY` differs; it's baked into the bundle at build time | Same fix — the key must match, then rebuild |
| Pathao/Meta credentials unreadable | `ENCRYPTION_KEY` regenerated instead of copied | Restore the old key; the ciphertext in the DB is unchanged |
| Auth container runs migrations on boot | Restored onto a non-empty PGDATA | Wipe `volumes/db/data`, re-init, restore again |
| Orders missing after cutover | Old app restarted after the freeze — split brain | Do not restart `app` on OLD after 5a. Recover by dumping the old DB and reconciling by `created_at` |
| Webhooks stop arriving | Old box decommissioned too early, or a redirect added to the proxy | Keep the proxy up 72h; never redirect `/api/*` |
| Deploys appear to succeed but change nothing | `VPS_HOST` still points at the old box | Step 5e |
| Build OOM-killed on NEW | No swap on a 4 GB box | Add 2–4 GB swap, rebuild |

# Rollback

Before 5d, rollback is free: `docker compose … start app` on OLD and delete
nothing on NEW. The old box never stopped being authoritative.

After 5d, roll back by restoring `Caddyfile.pre-migration` on OLD and starting
`app` there — but any writes that landed on the new box in the interim must be
dumped and reconciled by hand. That window is why 5c is verified before 5d.
