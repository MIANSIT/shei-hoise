import { create } from "zustand";

interface AuthState {
  isAdminLoggedIn: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  hydrated: boolean; // track first hydration
}

export const useAuthStore = create<AuthState>((set) => ({
  isAdminLoggedIn: false,
  hydrated: false,

  checkAuth: async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      set({ isAdminLoggedIn: data.isAdmin, hydrated: true });
    } catch (err) {
      console.error("checkAuth error:", err);
      set({ isAdminLoggedIn: false, hydrated: true });
    }
  },

  logout: async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      set({ isAdminLoggedIn: false });
    }
  },
}));
