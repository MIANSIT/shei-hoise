# Claude.md - Guidelines for AI Assistance on Shei Hoise

This document contains specific guidelines and conventions for Claude to follow when working on the Shei Hoise project.

---

## Core Principles

1. **Understand Before Coding** - Always read relevant files and understand the architecture before making changes
2. **Consistency** - Match existing code style, patterns, and conventions
3. **Type Safety** - Use TypeScript strictly; avoid `any` types
4. **No Assumptions** - Ask or investigate if unclear about requirements or existing patterns
5. **Minimal Changes** - Only modify what's necessary; don't refactor unrelated code

---

## Project Quick Facts

- **Type**: Multi-tenant e-commerce platform
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL with RLS)
- **State**: Zustand + React Query + React Context
- **Styling**: Tailwind CSS 4
- **Auth**: Supabase JWT with multi-tenant isolation
- **Package Manager**: pnpm

---

## File Organization Rules

### When Creating New Files

**Pages**: `src/app/[route]/page.tsx`

```typescript
// Always include proper metadata and error boundaries
export const metadata = { title: "Page Title" };

export default function Page() {
  // Page implementation
}
```

**Components**: `src/components/[feature]/ComponentName.tsx`

```typescript
// Named export, explicit props type
interface ComponentNameProps {
  // ...
}

export function ComponentName({ ... }: ComponentNameProps) {
  // ...
}
```

**Hooks**: `src/lib/hook/useFeatureName.ts`

```typescript
// Always include JSDoc
/**
 * Description of hook
 * @returns Type description
 */
export function useFeatureName() {
  // ...
}
```

**Stores**: `src/lib/store/featureStore.ts`

```typescript
// Zustand store pattern - always define types first
interface FeatureState {
  // state properties
}

export const useFeatureStore = create<FeatureState>((set) => ({
  // implementation
}));
```

**API Routes**: `src/app/api/[route-name]/route.ts`

```typescript
// Always validate input, include error handling
export async function POST(req: Request) {
  try {
    // implementation
    return Response.json(
      {
        /* data */
      },
      { status: 200 },
    );
  } catch (error) {
    // error handling
    return Response.json({ error: message }, { status: 500 });
  }
}
```

---

## Code Patterns to Follow

### 1. Data Fetching (React Query)

```typescript
// In src/lib/queries/featureQueries.ts
export const useGetFeature = (featureId: string) => {
  return useQuery({
    queryKey: ["feature", featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("id", featureId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
  });
};

// In component
const { data: feature, isLoading, error } = useGetFeature(featureId);
```

### 2. State Management (Zustand)

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### 3. Form Handling (React Hook Form + Zod)

```typescript
// Define schema first
const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.number().positive("Price must be positive"),
  description: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

// In component
const form = useForm<ProductForm>({
  resolver: zodResolver(productSchema),
  defaultValues: { name: "", price: 0 },
});
```

### 4. Protected Components

```typescript
// Check auth in layout or component
function ProtectedComponent() {
  const user = useCurrentUser();

  if (!user) {
    return <div>Access Denied</div>;
  }

  return <div>Protected content</div>;
}
```

### 5. Multi-Tenant Queries

Always include `store_id` check:

```typescript
const { data: products } = useQuery({
  queryKey: ["products", storeId],
  queryFn: async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    return data;
  },
});
```

---

## TypeScript Conventions

### Type Definitions

```typescript
// File: src/lib/types/index.ts (or feature-specific file)

export interface Store {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string;
  created_at: string;
}

// Never use `any`
// Prefer explicit types over inferred
// Use `readonly` for immutable data
export interface AppConfig {
  readonly maxFileSize: number;
  readonly supportedFormats: readonly string[];
}
```

### Naming Conventions

- **Types/Interfaces**: PascalCase → `ProductCard`, `UserProfile`
- **Functions/Hooks**: camelCase → `useCartItems()`, `fetchProducts()`
- **Constants**: UPPER_SNAKE_CASE → `MAX_UPLOAD_SIZE`, `DEFAULT_TIMEOUT`
- **Variables**: camelCase → `productId`, `isLoading`
- **Files**:
  - Components: PascalCase → `ProductCard.tsx`
  - Utilities: camelCase → `calculatePrice.ts`
  - Hooks: camelCase → `useCartItems.ts`
  - Stores: camelCase → `authStore.ts`

---

## Common Tasks

### Task: Add a New Field to Product

1. **Database**: Update `schema.sql`, add column to `products` table
2. **Types**: Add field to `Product` interface in `src/lib/types/`
3. **Schema**: Update Zod product schema in `src/lib/schema/`
4. **API**: Update API route to handle new field
5. **Component**: Update product form component
6. **Tests**: Add field to test fixtures

### Task: Create New Admin Feature

1. Create page in `src/app/dashboard/[feature]/page.tsx`
2. Create components in `src/components/admin/[feature]/`
3. Create queries in `src/lib/queries/[feature]Queries.ts`
4. Create Zod schemas for forms
5. Add store if global state needed
6. Update dashboard navigation if needed

### Task: Fix a Bug

1. Reproduce issue locally
2. Add console logs or debugger to isolate
3. Check related types and interfaces
4. Review React Query cache state
5. Check Zustand state if relevant
6. Verify database data with Supabase Studio
7. Test fix on feature branches before merging

---

## Error Handling

### Pattern for API Routes

```typescript
export async function POST(req: Request) {
  try {
    // Validate input
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    // Get user context
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Execute business logic
    const { data, error } = await supabase
      .from("products")
      .insert(validated)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Pattern for Components

```typescript
function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    try {
      // action
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      // Optionally: toast.error(message);
    }
  };

  if (error) return <ErrorBoundary message={error} />;

  return <div>{/* content */}</div>;
}
```

---

## Performance & Optimization

### Code Splitting

```typescript
// Import heavy components dynamically
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Memoization

```typescript
interface ProductCardProps {
  product: Product;
}

// Memoize to prevent re-renders
export const ProductCard = React.memo(function ProductCard({
  product
}: ProductCardProps) {
  return <div>{product.name}</div>;
});
```

### Query Optimization

```typescript
// Use specific fields, not SELECT *
const { data } = await supabase
  .from("products")
  .select("id, name, price") // Don't fetch unnecessary data
  .eq("store_id", storeId);
```

---

## Testing Patterns

### Unit Tests for Utils

```typescript
// src/lib/utils/__tests__/calculateTotal.test.ts
import { calculateTotal } from "../calculateTotal";

describe("calculateTotal", () => {
  it("should sum cart items correctly", () => {
    const items = [
      { id: "1", price: 100, quantity: 2 },
      { id: "2", price: 50, quantity: 1 },
    ];
    expect(calculateTotal(items)).toBe(250);
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('renders product name', () => {
    const product = { id: '1', name: 'Test Product', price: 100 };
    render(<ProductCard product={product} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
```

---

## Common Mistakes to Avoid

1. ❌ **Missing store_id checks** - Always verify multi-tenant isolation
2. ❌ **Forgetting error handling** - All async operations need try/catch
3. ❌ **Hardcoding values** - Use environment variables or constants
4. ❌ **Ignoring TypeScript errors** - Don't suppress with `//@ts-ignore`
5. ❌ **Using `any` type** - Always define proper types
6. ❌ **Database N+1 queries** - Use efficient joins and selects
7. ❌ **Side effects in render** - Use useEffect, not event handlers in JSX
8. ❌ **Mutable state** - Use Zustand, useState, or local state properly
9. ❌ **Blocking UI** - Keep calculations off main thread, use workers if needed
10. ❌ **Stale closures** - Dependency arrays in useEffect, useCallback

---

## Before You Commit

- [ ] Code follows existing style (run `pnpm lint`)
- [ ] All TypeScript errors resolved (no `any` or `//@ts-ignore`)
- [ ] Tests pass (if applicable)
- [ ] No console.log or debugger statements left
- [ ] Component/function has clear purpose and naming
- [ ] Error handling implemented
- [ ] Types defined for props and state
- [ ] Database queries include proper filters (store_id, etc.)
- [ ] Accessibility considered (ARIA labels, semantic HTML)
- [ ] Performance implications reviewed

---

## Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build && pnpm start   # Production build & run

# Linting & Formatting
pnpm lint                   # Run ESLint
pnpm lint --fix            # Auto-fix issues

# Database (Supabase CLI)
supabase status            # Check connection
supabase db pull           # Pull latest schema
supabase db push           # Push migrations
supabase studio            # Open Supabase dashboard

# Type Checking
npx tsc --noEmit           # Check types
```

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Zustand**: https://github.com/pmndrs/zustand
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zod**: https://zod.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

---

## Questions to Ask Yourself

When working on a task, ask:

1. **Do I understand the full scope?** - Read existing code first
2. **Is this consistent with patterns?** - Follow existing conventions
3. **Did I add types?** - Every function, hook, and component
4. **Did I handle errors?** - All async operations
5. **Did I verify auth/permissions?** - Multi-tenant isolation
6. **Will this perform well?** - Consider query optimization
7. **Is this maintainable?** - Clear naming and comments
8. **Did I test it?** - At least manual testing
9. **Did I break anything?** - Related features still work
10. **Can I explain it?** - Code is self-documenting

---

## Communication Style

When implementing features or fixes:

- Be concise but clear
- Provide context for why changes were made
- Flag any concerns or assumptions
- Ask for clarification when ambiguous
- Suggest alternatives if main approach has trade-offs

---

## Last Updated

- **Date**: March 9, 2026
- **Author**: Auto-generated for Shei Hoise project
- **Review Frequency**: Update as patterns evolve
