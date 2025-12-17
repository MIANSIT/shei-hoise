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

export async function getAllStoreCustomers(
  storeId: string,
  search?: string,
  page?: number,
  pageSize?: number
): Promise<DetailedCustomer[] | PaginatedCustomers> {
  if (!storeId) throw new Error("Store ID is required");

  try {
    // Step 1: Get linked customer IDs
    const { data: links, error: linkError } = await supabase
      .from("store_customer_links")
      .select("customer_id")
      .eq("store_id", storeId);

    if (linkError) throw linkError;
    if (!links || links.length === 0) {
      // Return empty array or paginated response
      if (page !== undefined && pageSize !== undefined) {
        return {
          customers: [],
          totalCount: 0,
          currentPage: page,
          totalPages: 0,
          hasMore: false,
        };
      }
      return [];
    }

    const customerIds = links.map((link) => link.customer_id);

    // Step 2: Build query for customers
    let query = supabase
      .from("store_customers")
      .select(
        `id, name, email, phone, profile_id, created_at, updated_at,
         customer_profiles!customer_profiles_store_customer_id_fkey(*)`,
        { count: page !== undefined ? "exact" : undefined }
      )
      .in("id", customerIds);

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(
        `name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      );
    }

    // Apply pagination if provided
    if (page !== undefined && pageSize !== undefined) {
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);
    }

    // Apply ordering
    query = query.order("created_at", { ascending: false });

    const { data: customers, error: customerError, count } = await query;

    if (customerError) throw customerError;
    if (!customers) {
      if (page !== undefined && pageSize !== undefined) {
        return {
          customers: [],
          totalCount: 0,
          currentPage: page || 1,
          totalPages: 0,
          hasMore: false,
        };
      }
      return [];
    }

    // Step 3: Fetch orders for all customers in this store
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, customer_id, created_at")
      .in("customer_id", customerIds)
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
