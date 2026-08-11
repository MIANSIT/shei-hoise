# Accessing Kong and browsing the APIs

Kong (`docker/volumes/api/kong.yml`) is the single public gateway in front of
Auth (GoTrue), PostgREST, Storage-API, postgres-meta, and Studio — this is
exactly what `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_PUBLIC_URL` points at.
Server-side app code reaches it internally via `SUPABASE_INTERNAL_URL`
(`http://kong:8000`); everything external — browsers, `curl`, Postman — uses
`SUPABASE_PUBLIC_URL` (`http://<vps-ip>:8000` today, `https://api.<domain>`
once DNS/Caddy are set up).

## Authentication model

Every route (except the ones explicitly marked open below) requires an
`apikey` header, and most also accept/require a bearer token:

```
apikey: <ANON_KEY or SERVICE_ROLE_KEY>
Authorization: Bearer <ANON_KEY or SERVICE_ROLE_KEY or a real user JWT>
```

Both keys live in `docker/.env.prod` on the VPS (`ANON_KEY`, `SERVICE_ROLE_KEY`).
Kong maps them to two ACL groups that gate which routes are reachable:

| Key | Consumer | ACL group | Can reach |
|---|---|---|---|
| `ANON_KEY` | `anon` | `anon` | Public-facing routes (auth, rest, graphql, storage) |
| `SERVICE_ROLE_KEY` | `service_role` | `admin` | Everything `anon` can, plus admin-only routes (`/rest/v1/` root, `/pg/*`) |

Never ship `SERVICE_ROLE_KEY` to a browser — it bypasses Row-Level Security
entirely. `ANON_KEY` is the one baked into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Route map

| Path prefix | Goes to | Auth required | Purpose |
|---|---|---|---|
| `/auth/v1/verify`, `/callback`, `/authorize`, `/.well-known/jwks.json`, `/sso/saml/*` | GoTrue (open) | none | Auth flows that must work before a session exists (email verification links, OAuth callbacks) |
| `/auth/v1/*` | GoTrue | `anon` or `admin` | Sign up/in/out, password recovery, session refresh, admin user management |
| `/rest/v1/` (exact root) | PostgREST | `admin` only | OpenAPI schema for the whole REST API — see below |
| `/rest/v1/*` | PostgREST | `anon` or `admin` | Table/view CRUD (`supabase-js` `.from(...)` calls) |
| `/graphql/v1` | PostgREST (`/rpc/graphql`) | `anon` or `admin` | GraphQL, if used |
| `/storage/v1/*` | Storage-API | none at the gateway (Storage-API checks its own JWT/S3 signature) | File upload/download, bucket management |
| `/pg/*` | postgres-meta | `admin` only | Low-level schema introspection (Studio's Table Editor uses this internally) |
| `/` (everything else) | Studio | HTTP Basic (`DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`) | The dashboard UI itself |

**Present in `kong.yml` but non-functional in this stack** — routes for
`/realtime/v1/*` and `/functions/v1/*` exist in the config (harmless, Kong
just errors per-request rather than at startup) but point at containers we
don't run (`realtime`, `functions` — confirmed unused, see `docker/README.md`).
`/mcp` and `/api/mcp` are hard-blocked (403) by design.

## The easiest way to actually browse the API: Studio

Open `SUPABASE_PUBLIC_URL` in a browser (basic-auth prompt uses
`DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD` from `docker/.env.prod`) — this is
Studio, proxied through Kong's catch-all `dashboard` route. From there:

- **Table Editor** — browse every table/row directly (via `/pg/*`).
- **API Docs** (in the sidebar) — Studio renders the live PostgREST OpenAPI
  spec as a readable, clickable reference with ready-to-copy `curl` and
  `supabase-js` snippets for every table, already filled in with your real
  `ANON_KEY` and project URL. This is the actual answer to "see all the
  APIs" for the REST layer — no separate tool needed.

## Raw `curl` examples

```bash
# Health check (no auth needed, one of the "open" routes' underlying service)
curl "$SUPABASE_PUBLIC_URL/auth/v1/health"

# List rows from a public table (anon key — respects RLS)
curl "$SUPABASE_PUBLIC_URL/rest/v1/stores?select=id,store_name,store_slug" \
  -H "apikey: $ANON_KEY"

# The full REST OpenAPI schema (admin only)
curl "$SUPABASE_PUBLIC_URL/rest/v1/" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Sign in a real user
curl -X POST "$SUPABASE_PUBLIC_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"..."}'

# List storage buckets
curl "$SUPABASE_PUBLIC_URL/storage/v1/bucket" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

## Inspecting Kong's own config (not the same as the Admin API)

`docker/volumes/api/kong.yml` above **is** the definitive, static source of
truth for every route — Kong runs in DB-less/declarative mode
(`KONG_DATABASE: "off"`), so there's no database to query for "what routes
exist right now" separate from that file. To see it exactly as Kong loaded
it (after the `$VAR` substitutions `kong-entrypoint.sh` performs):

```bash
docker exec shei-hoise-kong cat /usr/local/kong/kong.yml
```

### Optional: Kong's Admin API (only if you specifically need live introspection)

Kong also exposes a genuine Admin API (routes/services/plugins as JSON,
health/status endpoints) that's currently **not enabled or published** in
`docker-compose.yml` — deliberately, since it grants full control over the
gateway with no authentication of its own. If you need it:

1. Add to the `kong` service's environment: `KONG_ADMIN_LISTEN: 127.0.0.1:8001`.
2. Do **not** publish port 8001 in `ports:` — access it only via an SSH
   tunnel: `ssh -L 8001:127.0.0.1:8001 azureuser@<vps-ip>`, then
   `curl http://127.0.0.1:8001/routes` locally.

For day-to-day use, reading `kong.yml` directly or using Studio's API Docs
page is simpler and doesn't require touching the compose file at all.
