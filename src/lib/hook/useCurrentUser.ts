"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CurrentUser, userSchema } from "../types/users";

interface UseCurrentUserOptions {
  guestMode?: boolean;
}

export function useCurrentUser({
  guestMode = false,
}: UseCurrentUserOptions = {}) {
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

        if (authErr) {
          if (!guestMode) throw authErr; // only throw if not guestMode
          console.warn("Guest mode active: auth session missing");
          setUser(null);
          return;
        }

        if (!authUser) {
          setUser(null); // no session
          return;
        }

        const { data, error: dbErr } = await supabase
          .from("users")
          .select("id,email,first_name,phone,store_id,user_type")
          .eq("id", authUser.id)
          .single();

        if (dbErr) {
          if (!guestMode) throw dbErr; // only throw if not guestMode
          console.warn("Guest mode active: failed to fetch user from DB");
          setUser(null);
          return;
        }

        const parsed = userSchema.parse(data);
        setUser(parsed);
      } catch (err) {
        console.error("useCurrentUser error:", err);
        setError(err as Error);
        if (guestMode) setUser(null); // allow guest if enabled
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [guestMode]);

  return { user, loading, error, role: user?.user_type };
}
