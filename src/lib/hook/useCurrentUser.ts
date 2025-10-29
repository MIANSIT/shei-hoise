"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
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

        // Fetch store slug using the correct column name
        if (parsed.store_id) {
          console.log("Fetching store slug for store_id:", parsed.store_id);
          const { data: storeData, error: storeErr } = await supabase
            .from("stores")
            .select("store_slug") // <-- Use your actual slug column name here
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

  return { user, storeSlug, loading, error, role: user?.user_type };
}
