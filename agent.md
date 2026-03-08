# Agent Documentation - Shei Hoise

## Project Overview

**Shei Hoise** is a **multi-tenant e-commerce platform** built with Next.js, Supabase, and modern React patterns. It provides a complete solution for managing stores, products, customers, orders, and shipping.

**Purpose:** Enable businesses to create and manage their own online storefronts with support for multi-store management, product catalogs, customer authentication, checkout flows, and admin dashboards.

**Key Stats:**

- Framework: Next.js 16 + React 19
- Database: Supabase (PostgreSQL)
- State Management: Zustand
- Styling: Tailwind CSS 4
- Form Handling: React Hook Form + Zod
- Data Fetching: TanStack React Query
- UI Components: Shadcn/ui + Ant Design
- Authentication: Supabase Auth with JWT tokens

---

## Architecture Overview

### Directory Structure

```
src/
├── app/                          # Next.js App Router pages & layouts
│   ├── api/                      # API routes (login, logout, tokens, invoices)
│   ├── [store_slug]/             # Dynamic store routes (customer-facing)
│   │   ├── about-us/
│   │   ├── checkout/
│   │   ├── complete-account/
│   │   ├── confirm-order/
│   │   ├── generate-orders-link/
│   │   ├── login/
│   │   ├── my-profile/
│   │   ├── order-status/
│   │   ├── product/
│   │   ├── privacy-policy/
│   │   ├── signup/
│   │   ├── terms-and-conditions/
│   │   └── layout.tsx             # Store layout with header/footer
│   └── dashboard/                # Admin dashboard (multi-tenant)
│       ├── admin-profile/
│       ├── customers/
│       ├── expense/
│       ├── orders/
│       ├── products/
│       ├── shipping-Management/
│       └── store-management/
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   ├── auth/                     # Authentication components
│   ├── cart/                     # Shopping cart components
│   ├── common/                   # Reusable components
│   ├── header/                   # Navigation header
│   ├── invoice/                  # Invoice generation
│   ├── orders/                   # Order management
│   ├── products/                 # Product display/management
│   ├── shipping/                 # Shipping management
│   ├── user-profile/             # User profile components
│   └── ui/                       # Shadcn UI primitive components
└── lib/                          # Utilities & services
    ├── context/                  # React Context (CartContext)
    ├── errors/                   # Custom error types
    ├── helpers/                  # Utility functions
    ├── hook/                     # Custom React hooks
    ├── queries/                  # React Query hooks
    ├── redis/                    # Redis integration (Upstash)
    ├── schema/                   # Zod validation schemas
    ├── store/                    # Zustand stores
    ├── supabase/                 # Supabase client setup
    ├── types/                    # TypeScript types
    └── utils/                    # General utilities
```

---

## Core Concepts

### 1. **Multi-Tenant Architecture**

- Each store has its own slug (`[store_slug]`)
- Stores have separate product catalogs, customers, and orders
- Admin dashboard filtered by authenticated store owner
- Database normalized with `store_id` foreign key

### 2. **Authentication**

- Supabase Auth with JWT tokens
- `/api/login` and `/api/logout` endpoints
- `/api/me` - Get current authenticated user
- Sessions stored via Supabase SSR
- Store ownership verified through auth tokens

### 3. **State Management**

- **Zustand** for global state:
  - `authStore` - User authentication state
  - `cartStore` - Shopping cart items
  - `userInformationStore` - User profile data
  - `orderData` - Order details
  - `contact` - Contact form state
- **React Context** for CartContext
- **React Query** for server data caching

### 4. **Data Flow**

- **Client → API Routes** → Supabase (via RLS policies)
- **React Query** handles data fetching with automatic caching
- **Zustand** manages client state for UI
- **Server Actions** for mutations (if configured)

### 5. **Image Handling**

- **Supabase CDN** for image storage (production & dev buckets)
- `unoptimized: true` in Next.js config (images served directly)
- **No caching headers** - Images always fetch fresh
- Remote patterns configured for both prod & dev Supabase URLs

---

## Key Features

### For Customers

- **Product Browsing** - Categories, filters, search
- **Shopping Cart** - Add/remove items, persistent across sessions
- **Checkout** - Multi-step checkout flow
- **Order Management** - Track orders, view order status
- **User Accounts** - Registration, profile management, order history
- **Invoice Downloads** - PDF generation with jsPDF

### For Store Admins

- **Dashboard** - Overview of orders, products, metrics
- **Product Management** - Create, edit, delete products with variants
- **Order Management** - Process orders, manage status
- **Customer Management** - View customer list, segments
- **Shipping Management** - Configure shipping rates, track shipments
- **Store Settings** - Branding, policies, general info
- **Expense Tracking** - Monitor business expenses

### For B2B (Order Links)

- `/generate-orders-link` - Admin can create special checkout links
- Allows bulk ordering or special partner pricing
- Shareable public checkout flows

---

## Important Files & Configurations

### Configuration Files

- `next.config.ts` - Image patterns, server actions, headers
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript settings
- `eslint.config.mjs` - ESLint rules
- `schema.sql` - Supabase database schema
- `supabase/config.toml` - Supabase project config

### Database (Supabase)

Tables:

- `stores` - Store records
- `users` - Customer/admin users
- `products` - Product catalog
- `product_variants` - Product variants (size, color, etc.)
- `categories` - Product categories
- `carts` - Shopping carts
- `cart_items` - Items in carts
- `orders` - Order records
- `order_items` - Items in orders
- `customers` - Customer profiles
- `shipping` - Shipping configurations

RLS Policies:

- Customers can only see public products
- Admins can only see their own store data
- Cart isolation by user & store

---

## Development Workflows

### Adding a New Feature

1. **Database Schema** - Update `schema.sql` if needed, run migration
2. **Types** - Add TypeScript types in `src/lib/types/`
3. **Validation** - Create Zod schemas in `src/lib/schema/`
4. **Supabase Client** - Add queries in `src/lib/queries/` as React Query hooks
5. **State** - If global state needed, add to `src/lib/store/`
6. **Components** - Build in `src/components/`
7. **Pages** - Add routes in `src/app/`

### Adding API Endpoint

1. Create directory: `src/app/api/[route-name]/`
2. Create `route.ts` with `POST`, `GET`, etc.
3. Validate request with Zod
4. Use Supabase client to query DB
5. Return JSON response with proper status codes

### Building Admin Features

1. Features live in `src/app/dashboard/`
2. Access controlled via auth check on layout
3. Store ownership verified via `useCurrentUser()` hook
4. Use `useDashboardData()` for store-specific queries
5. Admin components in `src/components/admin/`

---

## Common Patterns

### Getting Current User

```typescript
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const user = useCurrentUser();
// user.id, user.email, user.user_metadata
```

### Fetching Data with React Query

```typescript
import { useQuery } from "@tanstack/react-query";

const { data: products, isLoading } = useQuery({
  queryKey: ["products", storeId],
  queryFn: () => fetchStoreProducts(storeId),
});
```

### Global State (Zustand)

```typescript
import { useAuthStore } from "@/lib/store/authStore";

const { user, setUser, logout } = useAuthStore();
```

### Form Validation (React Hook Form + Zod)

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(productSchema),
  defaultValues: { name: "", price: 0 },
});
```

### Protected Routes

Check in layout or middleware if user is authenticated and has proper permissions.

---

## Common Issues & Solutions

### Image Caching Issues

- Images stored on Supabase CDN
- Headers set to `no-cache, no-store, must-revalidate`
- Add timestamp to image URLs if cache bypass needed

### Cart Persistence

- Cart items stored in database with `user_id` and `store_id`
- Zustand syncs with DB on app load
- Use `useCartItems()` hook for current cart

### Multi-Store Confusion

- Always verify `store_id` in queries
- Use `[store_slug]` dynamic route to get current store
- Admin dashboard filters by `useCurrentUser().store_id`

### Authentication Errors

- Check Supabase session in `/api/me`
- Verify JWT token validity
- Clear localStorage if token stale
- Use Supabase SSR wrapper for layout auth

---

## Performance Considerations

- **Caching** - React Query caches data; manual invalidation with `queryClient.invalidateQueries()`
- **Images** - Unoptimized but served from CDN; consider adding image compression in Supabase
- **Database** - Use RLS policies; avoid N+1 queries
- **Server Actions** - 10MB max body size configured
- **Bundle Size** - Monitor dependencies; big libraries like `jspdf`, `html2canvas`

---

## Testing & Debugging

### Local Development

```bash
pnpm dev
# Runs on http://localhost:3000
```

### Debugging Auth

- Check browser DevTools → Application → Cookies for `sb-*` tokens
- Check browser Console for auth errors
- Use `/api/me` to verify session

### Database Inspection

- Use Supabase Studio dashboard
- Run migrations with `supabase db push`
- Check RLS policies in table settings

### Environment Variables

- `.env.local` (never commit)
- Must include Supabase URL & anon key
- Check `supabase/config.toml` for Supabase config

---

## Dependencies Overview

| Package                   | Purpose                  |
| ------------------------- | ------------------------ |
| `@supabase/supabase-js`   | Database & auth          |
| `@tanstack/react-query`   | Server state management  |
| `zustand`                 | Client state management  |
| `react-hook-form` + `zod` | Form validation          |
| `@radix-ui/*`             | Headless UI components   |
| `antd`                    | Design system components |
| `tailwindcss`             | Styling                  |
| `recharts`                | Dashboard charts         |
| `jspdf` + `html2canvas`   | PDF generation           |
| `xlsx`                    | Excel export             |
| `framer-motion`           | Animations               |
| `@dnd-kit/*`              | Drag & drop              |
| `@upstash/redis`          | Caching (optional)       |

---

## Code Style & Best Practices

1. **Type Everything** - Use TypeScript; avoid `any`
2. **Component Organization** - One component per file, named exports
3. **Naming Conventions**:
   - Components: PascalCase (e.g., `ProductCard`)
   - Functions/hooks: camelCase (e.g., `useCartItems`)
   - Constants: UPPER_SNAKE_CASE (e.g., `MAX_PRICE`)
4. **Error Handling** - Use custom error types in `src/lib/errors/`
5. **Validation** - Always validate with Zod before DB mutations
6. **Comments** - Document complex logic; use TSDoc for functions
7. **Git Commits** - Use conventional commits (feat:, fix:, docs:, etc.)

---

## When You Encounter Code

### Investigation Steps

1. Check the file's imports to understand dependencies
2. Look for related types in `src/lib/types/`
3. Check Zustand stores if global state involved
4. Look at related React Query hooks in `src/lib/queries/`
5. Check the database schema in `schema.sql` for DB structure
6. Trace the API flow: Component → Query Hook → API Route → Supabase

### Common File Locations

- New page? → `src/app/[route]/page.tsx`
- New component? → `src/components/[feature]/ComponentName.tsx`
- New API endpoint? → `src/app/api/[endpoint]/route.ts`
- New hook? → `src/lib/hook/useFeatureName.ts`
- New Zustand store? → `src/lib/store/nameStore.ts`
- New validation? → `src/lib/schema/nameSchema.ts`

---

## Quick Reference Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint

# Supabase
supabase db push     # Push migrations
supabase stop        # Stop local Supabase
supabase start       # Start local Supabase

# Database
pnpm db:seed         # Seed test data (if configured)
```

---

## Contact & Support

For specific technical questions about the codebase:

1. Check if similar patterns exist in current files
2. Review TypeScript types to understand data structures
3. Check React Query hooks for data fetching patterns
4. Review Zustand stores for state management
5. Check API routes for backend logic

---

## Last Updated

- **Date**: March 9, 2026
- **Next.js Version**: 16.0.7
- **React Version**: 19.2.1
- **Supabase Regions**: Production & Development buckets configured
