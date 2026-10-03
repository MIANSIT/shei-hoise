import { DetailedCustomer } from "@/lib/types/users";
import { supabase } from "@/lib/supabase";
import { fetchAllPaged } from "@/lib/queries/utils/fetchAllPaged";

// Define proper response types
interface PaginatedCustomers {
  customers: DetailedCustomer[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

interface RawCustomerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  customer_profiles:
    | {
        date_of_birth: string | null;
        gender: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
      }[]
    | null;
}

function toDetailedCustomer(
  c: RawCustomerRow,
  customerOrders: { created_at: string }[],
): DetailedCustomer {
  const profile = (c.customer_profiles || [])[0] || null;
  return {
    id: c.id,
    name: c.name || "Unknown Customer",
    email: c.email,
    phone: c.phone || undefined,
    status: "active",
    order_count: customerOrders.length,
    last_order_date: customerOrders[0]?.created_at ?? undefined,
    source: "direct",
    user_type: "customer",
    created_at: c.created_at,
    updated_at: c.updated_at,
    profile_id: c.profile_id || null,
    profile_details: profile
      ? {
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || null,
          address_line_1: profile.address || null,
          address_line_2: null,
          city: profile.city || null,
          state: profile.state || null,
          postal_code: profile.postal_code || null,
          country: profile.country || null,
          address: profile.address || null,
        }
      : null,
  };
}

/**
 * One page of a branch's customers (stores with branches): customers with at
 * least one order in that branch, paged and searched in the database by the
 * get_branch_customer_page RPC. Order counts are that branch's orders.
 */
async function getBranchStoreCustomers(
  storeId: string,
  branchId: string,
  search: string | undefined,
  page: number,
  pageSize: number,
): Promise<PaginatedCustomers> {
  const { data, error } = await supabase.rpc("get_branch_customer_page", {
    p_store_id: storeId,
    p_branch_id: branchId,
    p_search: search?.trim() || null,
    p_offset: (page - 1) * pageSize,
    p_limit: pageSize,
  });
  if (error) throw error;

  const payload = (data ?? { total: 0, ids: [] }) as { total: number; ids: string[] };
  const totalCount = Number(payload.total) || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const ids = payload.ids ?? [];
  if (ids.length === 0) {
    return { customers: [], totalCount, currentPage: page, totalPages, hasMore: false };
  }

  // One page of ids — a short list, safe to send.
  const [customersRes, ordersRes] = await Promise.all([
    supabase
      .from("store_customers")
      .select(
        "id, name, email, phone, profile_id, created_at, updated_at, customer_profiles!customer_profiles_store_customer_id_fkey(*)",
      )
      .in("id", ids),
    supabase
      .from("orders")
      .select("customer_id, created_at")
      .eq("store_id", storeId)
      .eq("branch_id", branchId)
      .in("customer_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (customersRes.error) throw customersRes.error;

  const rows = (customersRes.data ?? []) as unknown as RawCustomerRow[];
  const byId = new Map(rows.map((c) => [c.id, c]));
  const orders = (ordersRes.data ?? []) as { customer_id: string; created_at: string }[];

  const customers = ids
    .map((id) => byId.get(id))
    .filter((c): c is RawCustomerRow => !!c)
    .map((c) => toDetailedCustomer(c, orders.filter((o) => o.customer_id === c.id)));

  return { customers, totalCount, currentPage: page, totalPages, hasMore: page < totalPages };
}

export async function getAllStoreCustomers(
  storeId: string,
  search?: string,
  page?: number,
  pageSize?: number,
  /** Stores with branches: only customers who ordered from this branch (paged lists only). */
  branchId?: string | null,
): Promise<DetailedCustomer[] | PaginatedCustomers> {
  if (!storeId) throw new Error("Store ID is required");

  if (branchId && page !== undefined && pageSize !== undefined) {
    return getBranchStoreCustomers(storeId, branchId, search, page, pageSize);
  }

  try {
    // Query from store_customer_links (scoped directly by store_id) and embed
    // the linked store_customers row through the FK relationship, instead of
    // first fetching every linked customer_id and passing the whole list to
    // .in(...). For a store with hundreds of customers that .in() list built
    // a URL over 30KB, which Kong rejects with a 414 "URI too long" — the
    // customer list simply came back empty/errored for any sufficiently
    // active store, regardless of environment.
    const hasSearch = !!(search && search.trim());
    const embed = hasSearch
      ? "store_customers!inner!store_customer_links_customer_id_fkey"
      : "store_customers!store_customer_links_customer_id_fkey";

    let query = supabase
      .from("store_customer_links")
      .select(
        `${embed}(
          id, name, email, phone, profile_id, created_at, updated_at,
          customer_profiles!customer_profiles_store_customer_id_fkey(*)
        )`,
        { count: page !== undefined ? "exact" : undefined }
      )
      .eq("store_id", storeId);

    if (hasSearch) {
      const searchTerm = `%${search!.trim()}%`;
      query = query.or(
        `name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`,
        { referencedTable: "store_customers" }
      );
    }

    query = query.order("created_at", {
      ascending: false,
      referencedTable: "store_customers",
    });

    // Apply pagination if provided
    if (page !== undefined && pageSize !== undefined) {
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);
    }

    let links: unknown[] | null;
    let count: number | null = null;

    if (page !== undefined && pageSize !== undefined) {
      const res = await query;
      if (res.error) throw res.error;
      links = res.data;
      count = res.count ?? null;
    } else {
      // Unpaginated callers (the create-order and edit-order customer pickers)
      // want every customer. A single request is capped at PGRST_DB_MAX_ROWS
      // (1000), which silently returned 1000 of 1653 for the largest store —
      // customers past that point simply could not be selected on an order.
      links = await fetchAllPaged<unknown>((from, to) =>
        query.range(from, to),
      );
    }

    const customers = (links || [])
      .map((l) => (l as unknown as { store_customers: RawCustomerRow | null }).store_customers)
      .filter((c): c is RawCustomerRow => c !== null);

    if (customers.length === 0) {
      if (page !== undefined && pageSize !== undefined) {
        return {
          customers: [],
          totalCount: count || 0,
          currentPage: page,
          totalPages: 0,
          hasMore: false,
        };
      }
      return [];
    }

    // Scoped by store_id only, not .in("customer_id", customerIds): that list
    // would be the store's entire customer set, rebuilding the same URL-length
    // problem the customer query above was fixed for. Per-customer filtering
    // (customerOrders) narrows it down after the fetch instead.
    //
    // Paged, because this is an aggregate over the store's whole order history
    // and a
    // single request stops at PGRST_DB_MAX_ROWS (1000). The largest store has
    // 1699 orders, so the newest 1000 were all that counted — every customer
    // whose orders fell outside that window showed order_count 0 and no last
    // order date, with nothing to indicate the number was wrong.
    const orders = await fetchAllPaged<{
      id: string;
      customer_id: string | null;
      created_at: string;
    }>((from, to) =>
      supabase
        .from("orders")
        .select("id, customer_id, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .range(from, to),
    );

    // Step 4: Transform to DetailedCustomer
    const detailedCustomers: DetailedCustomer[] = customers.map((c) =>
      toDetailedCustomer(c, orders?.filter((o) => o.customer_id === c.id) || []),
    );

    // Return paginated response if page and pageSize are provided
    if (page !== undefined && pageSize !== undefined) {
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        customers: detailedCustomers,
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
      };
    }

    // Return simple array if no pagination
    return detailedCustomers;
  } catch (error) {
    console.error("Error fetching store customers:", error);
    throw error;
  }
}
