"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Toaster } from "@/app/components/ui/sheiSonner/sonner";
import { Moon, PanelLeft, Sun, X, LogOut, User } from "lucide-react";
import {
  ConfigProvider,
  theme as antdTheme,
  App as AntdApp,
  Spin,
  Drawer,
  Dropdown,
  MenuProps,
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
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";

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
    user,
  } = useCurrentUser();

  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const notify = useSheiNotification();

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
  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await supabase.auth.signOut();
      notify.success("Logout successful!");
      router.push("/admin-login");
    } catch (err: unknown) {
      console.error("Logout error:", err);
      if (err instanceof Error) {
        notify.error(`Logout failed: ${err.message}`);
      } else {
        notify.error("Logout failed. Please try again.");
      }
    } finally {
      setLogoutLoading(false);
    }
  };

  // User dropdown menu items
  const userMenu: MenuProps = {
    items: [
      {
        key: "profile",
        icon: <User className="w-4 h-4" />,
        label: "Profile",
        disabled: true, // You can implement profile page later
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogOut className="w-4 h-4" />,
        label: "Logout",
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

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
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-green-100 px-4">
          <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-7 w-7 text-green-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3M12 2a10 10 0 1010 10A10 10 0 0012 2z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold text-primary">
              Your Free Trial Has Ended
            </h1>

            {/* Description */}
            <p className="mt-3 text-sm text-primary leading-relaxed">
              Thanks for trying our platform! Your trial period has now ended.
            </p>

            <p className="mt-2 text-sm text-primary leading-relaxed">
              To continue managing your store, accessing orders, customers, and
              analytics, please choose a plan and complete your payment.
            </p>

            {/* Highlight box */}
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Your store and data are safe — nothing has been deleted.
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Link
                href="/contact-us"
                className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-primary hover:bg-green-800 transition"
              >
                Upgrade & Continue
              </Link>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-xs text-gray-500">
              Need help choosing a plan? Our support team is happy to help.
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-green-100 px-4">
          <div className="max-w-md w-full bg-background rounded-2xl shadow-xl p-8 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-7 w-7 text-yellow-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3m0 4h.01M12 2a10 10 0 1010 10A10 10 0 0012 2z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold text-primary">
              Dashboard Access Temporarily Restricted
            </h1>

            {/* Description */}
            <p className="mt-3 text-sm text-primary leading-relaxed">
              Your dashboard access has been temporarily restricted due to a
              pending payment or subscription issue.
            </p>

            <p className="mt-2 text-sm text-primary leading-relaxed">
              Your store, data, and customers are completely safe. Once the
              payment is settled, full access will be restored automatically.
            </p>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Link
                href="/contact-us"
                className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-primary hover:bg-green-800 transition"
              >
                Contact Support
              </Link>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-xs text-primary">
              If you believe this is a mistake, please reach out to our support
              team.
            </p>
          </div>
        </div>
      );
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
            className="flex items-center justify-between p-4 shadow-md sticky top-0 z-50"
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

              {/* User dropdown with logout */}
              <Dropdown
                menu={userMenu}
                trigger={["click"]}
                placement="bottomRight"
              >
                <button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-medium">
                    {user?.first_name
                      ? user.first_name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  {logoutLoading && <Spin size="small" />}
                </button>
              </Dropdown>
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
              title={
                <div className="flex items-center justify-between">
                  <span>Menu</span>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              }
              placement="left"
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              size="100%"
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

              <div className="flex justify-between items-center mb-2 p-4">
                <Breadcrumb />
                {store && storeStatus && (
                  <StoreStatusPopup
                    status={storeStatus}
                    isActive={storeIsActive}
                    createdAt={store.created_at}
                  />
                )}
              </div>
              <div className="flex-1 overflow-auto p-4">{children}</div>
            </main>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}
