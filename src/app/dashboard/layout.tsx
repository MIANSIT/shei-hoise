"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import SidebarProfile from "../components/admin/sidebar/SidebarProfile";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Toaster } from "@/app/components/ui/sheiSonner/sonner";
import { Moon, PanelLeft, Sun } from "lucide-react";
import {
  ConfigProvider,
  theme as antdTheme,
  App as AntdApp,
  Spin,
  Drawer,
} from "antd";
import { useSupabaseAuth } from "../../lib/hook/userCheckAuth";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { USERTYPE } from "@/lib/types/users";
import {
  getStoreBySlugWithLogo,
  StoreWithLogo,
} from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { StoreStatusPopup } from "@/app/components/admin/common/StoreStatusPopup";
import TrialEnded from "@/app/components/admin/StoreStatus/TrialEnded";
import AccessRestricted from "@/app/components/admin/StoreStatus/AccessRestricted";
// import { supabase } from "@/lib/supabase";
// import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const { session, loading: authLoading } = useSupabaseAuth();
  const router = useRouter();
  const {
    role,
    storeSlug,
    storeStatus,
    storeIsActive,
    loading: userLoading,
  } = useCurrentUser();

  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // const [, setLogoutLoading] = useState(false);
  // const notify = useSheiNotification();

  // Set mounted to true after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if no session
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/admin-login");
    }
    if (role !== undefined && role !== USERTYPE.STORE_OWNER) {
      router.push("/");
    }
  }, [authLoading, session, router, role]);

  // Fetch store data
  useEffect(() => {
    if (!storeSlug || storeLoading) return;

    setStoreLoading(true);
    getStoreBySlugWithLogo(storeSlug)
      .then((data) => {
        setStore(data);
        setStoreLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch store:", err);
        setStoreLoading(false);
      });
  }, [storeSlug]);

  // Check if mobile and handle sidebar - only run on client
  useEffect(() => {
    if (!mounted) return;

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Hide sidebar on mobile by default
      } else {
        setIsSidebarOpen(true); // Show sidebar on desktop
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mounted]);

  // Load saved theme - only run on client
  useEffect(() => {
    if (!mounted) return;

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, [mounted]);

  // Handle logout
  // const handleLogout = async () => {
  //   try {
  //     setLogoutLoading(true);
  //     await supabase.auth.signOut();
  //     notify.success("Logout successful!");
  //     router.push("/admin-login");
  //   } catch (err: unknown) {
  //     console.error("Logout error:", err);
  //     if (err instanceof Error) {
  //       notify.error(`Logout failed: ${err.message}`);
  //     } else {
  //       notify.error("Logout failed. Please try again.");
  //     }
  //   } finally {
  //     setLogoutLoading(false);
  //   }
  // };

  // User dropdown menu items
  // const userMenu: MenuProps = {
  //   items: [
  //     {
  //       key: "profile",
  //       icon: <User className="w-4 h-4" />,
  //       label: "Profile",
  //       disabled: true, // You can implement profile page later
  //     },
  //     {
  //       type: "divider",
  //     },
  //     {
  //       key: "logout",
  //       icon: <LogOut className="w-4 h-4" />,
  //       label: "Logout",
  //       danger: true,
  //       onClick: handleLogout,
  //     },
  //   ],
  // };

  // Combined loading states
  const isLoading = authLoading || userLoading || storeLoading;

  // Check if user should be blocked from accessing dashboard
  const shouldBlockAccess = !isLoading && !storeIsActive;

  // Show loading state while all data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-4">
        <Spin size="large" />
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  // Show blocked access screen
  if (shouldBlockAccess) {
    if (storeStatus === "trial") {
      return <TrialEnded />;
    } else {
      return <AccessRestricted status={storeStatus ?? undefined} />;
    }
  }

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileDrawerOpen(true);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  // Show dashboard
  return (
    <ConfigProvider
      theme={{
        algorithm:
          theme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 8,
        },
        components: {
          Menu: {
            itemColor: theme === "dark" ? "#d1d5db" : "#374151",
            itemHoverBg: theme === "dark" ? "#1f2937" : "#000000",
            itemHoverColor: theme === "dark" ? "#e5e7eb" : "#e5e7eb",
            itemSelectedBg: theme === "dark" ? "#374151" : "#000000",
            itemSelectedColor: "#ffffff",
            groupTitleColor: theme === "dark" ? "#d1d5db" : "#374151",
          },
          Drawer: {
            colorBgElevated: "var(--sidebar)",
          },
        },
      }}
    >
      <AntdApp>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header
            className="flex items-center justify-between p-1 shadow-md sticky top-0 z-50"
            style={{
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
          >
            <div className="flex items-center gap-2">
              {store?.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.store_name || "Store Logo"}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <Image src="/logo.png" alt="Logo" width={40} height={40} />
              )}
              <h1 className="text-lg font-bold">
                {store?.store_name || "Dashboard"}
              </h1>

              <button
                onClick={handleSidebarToggle}
                className="p-2 rounded hover:opacity-70 transition-transform duration-300"
                style={{ background: "var(--muted)" }}
              >
                <PanelLeft
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isMobile || !isSidebarOpen ? "rotate-0" : "rotate-180"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme toggle button */}
              <button
                onClick={() => {
                  const newTheme = theme === "light" ? "dark" : "light";
                  setTheme(newTheme);
                  localStorage.setItem("theme", newTheme);
                  document.documentElement.classList.toggle(
                    "dark",
                    newTheme === "dark",
                  );
                }}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>

              {/* User profile + logout */}
              <SidebarProfile />
            </div>
          </header>

          <div className="flex flex-1">
            {/* Desktop Sidebar - Hidden on mobile */}
            {!isMobile && (
              <div
                className={`sticky top-0 h-screen shadow-md transition-all duration-300 ${
                  isSidebarOpen
                }`}
                style={{ background: "var(--sidebar)" }}
              >
                <Sidebar collapsed={!isSidebarOpen} themeMode={theme} />
              </div>
            )}

            {/* Mobile Drawer for Sidebar - Now takes 100% width */}
            <Drawer
              title="Menu" // <-- just a string
              placement="bottom"
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              size="100%"
              closable={true} // <-- ensures default X shows
              styles={{
                body: { padding: 0 },
                header: {
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                },
              }}
            >
              <div className="h-full">
                <Sidebar
                  collapsed={false}
                  themeMode={theme}
                  isMobile={true}
                  onMobileMenuClick={() => setMobileDrawerOpen(false)}
                />
              </div>
            </Drawer>

            {/* Main content */}
            <main
              className="flex-1 flex flex-col overflow-auto min-h-[calc(100vh-73px)]"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <Toaster position="top-right" />

              <div className="flex justify-between items-center p-2">
                <Breadcrumb />
                {store && storeStatus && (
                  <StoreStatusPopup
                    status={storeStatus}
                    isActive={storeIsActive}
                    createdAt={store.created_at}
                  />
                )}
              </div>
              <div className="flex-1 overflow-auto p-3 ">{children}</div>
            </main>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

//layout
