"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string(),
  phone: z.string().nullable(),
  store_id: z.string().uuid().nullable(),
});

export type CurrentUser = z.infer<typeof userSchema>;

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
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
        if (!authUser) return setUser(null);

        const { data, error: dbErr } = await supabase
          .from("users")
          .select("id,email,first_name,phone,store_id")
          .eq("id", authUser.id)
          .single();

        if (dbErr) throw dbErr;
        const parsed = userSchema.parse(data);
        // console.log("👤 Current User:", parsed);
        setUser(parsed);
      } catch (err) {
        console.error("useCurrentUser error:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  return { user, loading, error };
}
