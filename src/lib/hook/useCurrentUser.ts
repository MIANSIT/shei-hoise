"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null); // UUID
  const [storeSlug, setStoreSlug] = useState<string | null>(null); // slug for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user: authUser },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        if (!authUser) {
          setUser(null);
          return;
        }

        const { data, error: dbErr } = await supabase
          .from("users")
          .select("id,email,first_name,phone,store_id,user_type")
          .eq("id", authUser.id)
          .single();

        if (dbErr) throw dbErr;

        const parsed = userSchema.parse(data);
        setUser(parsed);

        if (parsed.store_id) {
          setStoreId(parsed.store_id); // UUID for querying orders

          const { data: storeData, error: storeErr } = await supabase
            .from("stores")
            .select("store_slug") // slug for display purposes
            .eq("id", parsed.store_id)
            .single();

          if (storeErr) throw storeErr;

          setStoreSlug(storeData?.store_slug || null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, storeId, storeSlug, loading, error, role: user?.user_type };
}
