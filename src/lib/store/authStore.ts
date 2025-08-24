// lib/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isAdminLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAdminLoggedIn: false,
      login: () => set({ isAdminLoggedIn: true }),
      logout: () => set({ isAdminLoggedIn: false }),
    }),
    {
      name: "admin-auth", // localStorage key
    }
  )
);
