# Shei Hoise — Project Overview

Shei Hoise is a **multi-tenant e-commerce platform** built for f-commerce sellers (merchants who sell primarily through Facebook/Instagram) as well as standalone online stores. Each store is a fully isolated tenant with its own storefront, products, orders, customers, courier connections, and marketing configuration, all served from a single Next.js codebase and a single Supabase (Postgres) database using row-level security for tenant isolation.

## Programming Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase (PostgreSQL with Row-Level Security), Supabase JWT-based auth with multi-tenant isolation
- **State Management**: Zustand (client state) + React Query (server state) + React Context
- **Forms & Validation**: React Hook Form + Zod
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm

## What the Platform Does

### Storefront (`/[store_slug]/...`)
Each merchant gets a public storefront reachable by its own slug: product shop pages, product detail pages, cart and checkout, order confirmation and order-status tracking, customer login/signup, and standard policy pages (about, privacy, terms).

### Merchant Dashboard (`/dashboard/...`)
The admin side merchants use to run their store:
- Product management (add/edit, bundles, categories, stock)
- Order management (create/edit orders, vendor orders)
- Customer management
- Courier/shipping management (see Pathao section below)
- Expense tracking
- Pixel/marketing analytics
- Store settings and store management
- Subscription plans and billing

### Platform-Level Features
Tenant onboarding and provisioning (`/onboarding`, `/stores`), platform authentication, and a set of internal API routes for products feeds, invoices, subscriptions, and order notifications.

---

## Meta (Facebook) Pixel Integration — and Why It Matters for F-Commerce

F-commerce sellers acquire nearly all of their customers through Facebook and Instagram ads. Without accurate pixel data, ad platforms can't learn who converts, which makes ad spend far less efficient and drives up customer acquisition cost. Shei Hoise builds Meta Pixel tracking directly into the platform so every merchant gets ad-optimization data out of the box, without needing to touch any code themselves.

**How it works, end to end:**

- **Per-store, multi-tenant configuration**: Each store has its own Facebook Pixel ID and (optionally) a Conversions API access token, configured by the merchant in the dashboard (`StoreSettingsCard`) and stored against that store's settings row. The pixel script is mounted per-store in the storefront layout, so every tenant's storefront fires its *own* pixel — never a shared one.
- **Client-side tracking (`fbq`)**: A bootstrap script injects the standard Meta Pixel snippet and automatically fires `PageView` on every route change, capturing UTM parameters and Facebook's `fbclid` click ID for attribution.
- **Commerce events tracked**: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`, and `Search` — fired at the relevant points in the shop, product, and checkout pages. This is the exact event set Meta's ad algorithms use to optimize campaigns (e.g. "optimize for Purchase").
- **Server-side Conversions API (CAPI)**: In addition to the browser pixel, matching events are sent server-side directly to Meta's Graph API, with customer phone/email hashed (SHA-256) before sending. This is critical for f-commerce because:
  - iOS/browser tracking-prevention (ITP, ad blockers, Safari) silently drops a large share of browser-only pixel events.
  - Sending the *same event* from both the browser and the server (deduplicated via a shared `eventID`) gives Meta a much more complete, accurate signal — directly improving ad targeting and lowering cost-per-result.
  - CAPI is treated as a premium capability gated by the store's subscription plan (`hasFeature(subscription, "conversion_api")`), and only activates once a store has both a Pixel ID and an encrypted CAPI access token on file.
- **Analytics for merchants**: A dashboard page (`pixel-analytics`) lets merchants see their own tracked events, so they can verify their pixel is firing correctly without needing Meta's Events Manager.

In short: the platform turns "install a Facebook Pixel correctly, including server-side CAPI" — normally a technical, error-prone setup step — into a checkbox in store settings, which directly benefits f-commerce merchants whose entire funnel runs through Meta ads.

---

## Pathao Courier Integration

Pathao is one of Bangladesh's largest courier/delivery services, and it's integrated as one of the platform's supported couriers (alongside Steadfast and manual courier handling) so merchants can fulfill orders without leaving the dashboard.

**What's integrated:**

- **Connection & authentication**: Merchants connect their Pathao merchant account via OAuth from the dashboard (`/dashboard/courier/pathao`); access tokens are refreshed automatically as needed and credentials are stored per-store.
- **Location cascade**: City → Zone → Area lookups from Pathao's API, used to build accurate delivery address forms (Pathao requires this hierarchy for delivery routing).
- **Shipment creation**: When a merchant ships an order, the platform converts the Shei Hoise order into a Pathao consignment — creating the shipment via Pathao's API and recording the resulting consignment ID, delivery fee, COD amount, and weight/quantity details against the order.
- **Status tracking**: Order/shipment status can be refreshed on demand, and Pathao also pushes live updates via a **webhook** (one callback URL per connected merchant account), which the platform verifies by signature and uses to update delivery status and reconcile COD (cash-on-delivery) payment settlement automatically.
- **Unified courier hub**: Pathao sits alongside Steadfast and manual couriers in a single "Manage Couriers" screen, so merchants can mix courier providers per order while getting consistent status displays.

This matters for f-commerce specifically because most Bangladeshi f-commerce sellers rely on COD and third-party courier dispatch rather than self-delivery — automating shipment creation, tracking, and COD reconciliation removes a large chunk of manual, error-prone admin work per order.
