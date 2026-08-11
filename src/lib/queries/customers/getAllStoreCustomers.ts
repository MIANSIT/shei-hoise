import { DetailedCustomer } from "@/lib/types/users";
import { supabase } from "@/lib/supabase";

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

export async function getAllStoreCustomers(
  storeId: string,
  search?: string,
  page?: number,
  pageSize?: number
): Promise<DetailedCustomer[] | PaginatedCustomers> {
  if (!storeId) throw new Error("Store ID is required");

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

    const { data: links, error: linksError, count } = await query;
    if (linksError) throw linksError;

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

    // Scoped by store_id only, not .in("customer_id", customerIds) — a
    // customerIds list built from `customers` is only bounded when
    // page/pageSize are supplied (see .range() above). Callers like
    // create-order/edit-order call this with no pagination to get every
    // customer at once, which made that list the store's entire customer
    // set and rebuilt the exact URL-length problem the customer query above
    // was fixed for. Per-customer filtering below (customerOrders) already
    // narrows this down after the fetch.
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, customer_id, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    // Step 4: Transform to DetailedCustomer
    const detailedCustomers: DetailedCustomer[] = customers.map((c) => {
      const profiles = c.customer_profiles || [];
      const profile = profiles[0] || null;

      // Filter orders for this customer
      const customerOrders =
        orders?.filter((o) => o.customer_id === c.id) || [];

      return {
        id: c.id,
        name: c.name || "Unknown Customer",
        email: c.email,
        phone: c.phone || undefined,
        status: "active",
        order_count: customerOrders.length,
        last_order_date: customerOrders[0]?.created_at || null,
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
    });

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
