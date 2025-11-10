import { useState, useEffect } from "react";
import { useCurrentUser } from "../useCurrentUser";
import {
  getUserProfile,
  UserWithProfile,
} from "@/lib/queries/user/getUserProfile";

export function useUserProfile() {
  const { user: currentUser, loading: authLoading } = useCurrentUser();
  const [userProfile, setUserProfile] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profile = await getUserProfile(currentUser.id);
        setUserProfile(profile);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser?.id]);

  return {
    user: userProfile,
    loading: authLoading || loading,
    error,
    isAuthenticated: !!currentUser,
  };
}
