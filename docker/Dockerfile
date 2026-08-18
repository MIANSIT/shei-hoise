# syntax=docker/dockerfile:1
# Build context is the repo root: `docker compose -f docker/docker-compose.yml build app`

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG UPSTASH_REDIS_REST_URL
ARG UPSTASH_REDIS_REST_TOKEN
ARG SUPABASE_SERVICE_ROLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
    UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN \
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
    HUSKY=0 \
    NEXT_SKIP_VALIDATE_SERVER_COMPONENT_ROUTES=1

RUN echo "Build environment:" && \
    echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL" && \
    echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..." && \
    echo "Starting pnpm build..." && \
    pnpm build
    
RUN test -f /app/.next/standalone/server.js || \
    (echo "ERROR: .next/standalone/server.js missing — build did not produce standalone output" && exit 1)

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The image optimizer writes transformed images under /app/.next/cache, which
# docker-compose mounts as a named volume so the cache survives redeploys.
# Create it here, owned by nextjs: when Docker first mounts an empty named
# volume over a path that exists in the image, it seeds the volume from that
# path — including its ownership. Without this the volume is created as
# root:root, the container (uid 1001) cannot write to it, and every request
# silently re-encodes instead of caching.
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
