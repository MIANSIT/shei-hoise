---
name: deploy
description: Deploy Shei Hoise to the production VPS, or diagnose a failed deploy or an unreachable site. Use when the deploy workflow fails, the site is down or timing out, containers need checking or restarting, or someone asks how production is deployed. Covers the SSH route in, the compose stack, and the failure modes already hit in production.
---

# Deploying Shei Hoise

Production is a single self-hosted VPS running the Next app, Supabase (Postgres,
Kong, GoTrue, Storage) and Caddy in one Docker Compose stack. There is no
managed platform and no CDN — everything below runs against that one box.

## Facts

| | |
|---|---|
| Host | `165.99.219.4` — `sheihoise.com` and `api.sheihoise.com` both point here |
| SSH | `root`, **password auth only** (no keys installed). Password is `NEW_SERVER_PASSWORD` in `.env.local` |
| Repo on box | `/root/shei-hoise`, tracking `main` |
| Compose | `docker/docker-compose.yml`, plus `docker/docker-compose.proxy.yml` when `USE_PROXY=true` |
| Env file | `docker/.env.prod` (on the box; not in git) |
| Containers | `shei-hoise-app`, `shei-hoise-caddy`, `shei-hoise-kong`, `shei-hoise-storage` |
| CI | `.github/workflows/deploy.yml` — SSHes in with `sshpass`, pulls `main`, rebuilds the `app` service only |

`sshpass` is not installed on macOS by default. Use `expect`, or `brew install
sshpass`. Never put the password in argv or in a command that gets echoed.

## Deploying

Normal path is pushing to `main` — the workflow does the rest. Manually:

```bash
cd /root/shei-hoise
git pull origin main
docker compose -f docker/docker-compose.yml --env-file docker/.env.prod up -d --build app
docker compose -f docker/docker-compose.yml ps
```

Only the `app` service is rebuilt. Postgres, Kong and Caddy keep running —
never `down` the whole stack to ship application code.

## Diagnosing, in order

Work outside-in. Each step tells you which layer is broken.

**1. Is the host reachable at all?**

```bash
ping -c 3 165.99.219.4
nc -z -G 5 165.99.219.4 22
traceroute -w 2 -q 1 -m 20 165.99.219.4
```

If ping fails, all ports are closed, and traceroute ends with `!H` from the
provider's gateway (`103.151.196.160`), **the VM is not on the network** — the
guest's interface is down, or the kernel is wedged. This is below the
application layer; a host firewall would time out silently rather than make the
gateway report host-unreachable.

There is no fix over SSH for this. Open the provider panel's **VNC/serial
console**, which reaches the guest through the hypervisor: read what is on
screen first (kernel panic, OOM, emergency mode), then `ip a` (is the interface
up and does it hold the IP), `ip r` (default route), `df -h` (full disk),
`journalctl -p err -b`. "Running" in the provider panel only means the
hypervisor thinks the VM process exists — it says nothing about guest
networking. This exact failure happened and lasted days.

**2. Is HTTPS answering?**

```bash
curl -sS -o /dev/null -m 15 -w "%{http_code}\n" https://sheihoise.com/
curl -sS -o /dev/null -m 15 -w "%{http_code}\n" https://api.sheihoise.com/auth/v1/health
```

A 502 means Caddy is up and the app container is not — that is the good case,
and step 3 applies. A connection failure means step 1.

**3. Are the containers healthy?**

```bash
docker ps --format '{{.Names}} {{.Status}}'
docker logs --tail 100 shei-hoise-app
```

## Known failure modes

**`could not read Username for 'https://github.com'`** during `git pull`.
The repo went **private**, and the box pulls anonymously over HTTPS with no
credential configured. Confirm with `curl -s -o /dev/null -w "%{http_code}"
https://github.com/MIANSIT/shei-hoise` on the box — 404 unauthenticated means
private. Fix with a read-only deploy key (box has outbound SSH to GitHub on
both 22 and 443), a PAT in a credential store, or by having CI rsync the code
it already checked out instead of the box pulling.

**Healthcheck never passes.** `curl` is absent from the bare `node:20-alpine`
runner stage, and inside the container `localhost` resolves to IPv6 `[::1]`
while the server binds `HOSTNAME=0.0.0.0` (IPv4 only). The probe must use
`wget` against `127.0.0.1`, not `localhost`.

**Ports still published despite `docker-compose.proxy.yml`.** Compose *merges*
`ports` across files, so a bare `ports: []` merges to nothing and the base
file's mappings survive — this is how Kong was served over plain HTTP on a
public `:8000` in production. Needs `ports: !override []` (Compose ≥ 2.24).

**Restoring a database dump silently loses every auth user.** `pg_restore -U
postgres` is wrong: in `supabase/postgres` the `postgres` role is not a
superuser and the `auth`/`storage` schemas are owned by `supabase_admin`. The
image pre-creates `auth.users` with a different column set than the dump, so
that COPY fails while `public` and `storage` restore perfectly — the result
looks like a clean migration with correct order counts and nobody able to log
in. See `docker/VPS_MIGRATION.md`.

**Image optimizer re-encoding on every request.** The Next image cache lives on
the `next-image-cache` volume. If it is recreated as `root:root` the container
(uid 1001) cannot write to it and silently re-encodes forever. The Dockerfile
pre-creates `/app/.next/cache` owned by `nextjs` for this reason.

## Rules

- Confirm before restarting anything other than `app` — Postgres restarts are
  customer-visible and are almost never the fix.
- Never `docker compose down` the stack to deploy application code.
- Report what you actually observed (exit codes, HTTP status, container status),
  not that "it should be working now".
