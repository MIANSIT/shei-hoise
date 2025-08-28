"use client";

import { sideMenu } from "@/lib/menu";
import SidebarItem from "./SidebarItem";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import { useSheiNotification } from "../../../../lib/hook/useSheiNotification"; // adjust path

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const notify = useSheiNotification(); // initialize notification hook

  const handleLogout = () => {
    logout();
    notify.success("Logout successful!"); // ✅ Show modern toast
    router.push("/admin-login");
  };

  return (
    <aside
      className={`flex flex-col max-h-screen bg-black dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* Menu Section */}
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {sideMenu.map((menu) => (
          <SidebarItem key={menu.title} item={menu} collapsed={collapsed} />
        ))}
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between gap-3">
          {/* Avatar + Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
              U
            </div>
            {!collapsed && (
              <div className="flex flex-col transition-all duration-300 overflow-hidden">
                <span className="text-sm font-medium text-white">John Doe</span>
                <span className="text-xs text-gray-400">john@example.com</span>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            className={`p-2 rounded hover:bg-gray-700 text-red-500 transition-all duration-300 ${
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            }`}
            title="Logout"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
