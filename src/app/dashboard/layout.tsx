"use client";

import React, { useState, useEffect, useRef } from "react";
// import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import SidebarProfile from "../components/admin/sidebar/SidebarProfile";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Toaster } from "@/app/components/ui/sheiSonner/sonner";
import { Moon, PanelLeft, Sun, ArrowUp } from "lucide-react";
import {
  ConfigProvider,
  theme as antdTheme,
  App as AntdApp,
  Spin,
  Drawer,
} from "antd";
import { useSupabaseAuth } from "../../lib/hook/userCheckAuth";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { USERTYPE } from "@/lib/types/enums"; // ← add this

import {
  getStoreBySlugWithLogo,
  StoreWithLogo,
} from "@/lib/queries/stores/getStoreBySlugWithLogo";
import { StoreStatusPopup } from "@/app/components/admin/common/StoreStatusPopup";
import TrialEnded from "@/app/components/admin/StoreStatus/TrialEnded";
import AccessRestricted from "@/app/components/admin/StoreStatus/AccessRestricted";
import SubscriptionLocked from "@/app/components/admin/StoreStatus/SubscriptionLocked";
import GracePeriodBanner from "@/app/components/admin/StoreStatus/GracePeriodBanner";
import { getStoreSubscription, type StoreSubscription } from "@/lib/queries/subscription/getStoreSubscription";
import { getSubscriptionAccessState } from "@/lib/utils/subscriptionAccess";
import LanguageSwitcher from "@/app/components/common/LanguageSwitcher";
import { useTranslation } from "@/lib/hook/useTranslation";
// import { supabase } from "@/lib/supabase";
// import { useSheiNotification } from "@/lib/hook/useSheiNotification";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const t = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { session, loading: authLoading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {
    role,
    storeId,
    storeSlug,
    storeStatus,
    storeIsActive,
    loading: userLoading,
  } = useCurrentUser();

  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
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
  useEffect(() => {
    if (!storeSlug) return;

    let cancelled = false;
    setStoreLoading(true);

    getStoreBySlugWithLogo(storeSlug)
      .then((data) => {
        if (!cancelled) setStore(data);
      })
      .catch((err) => {
        console.error("Failed to fetch store:", err);
      })
      .finally(() => {
        if (!cancelled) setStoreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  useEffect(() => {
    if (!storeId) {
      setSubLoading(false);
      return;
    }
    let cancelled = false;
    setSubLoading(true);
    getStoreSubscription(storeId)
      .then((sub) => {
        if (!cancelled) setSubscription(sub);
      })
      .finally(() => {
        if (!cancelled) setSubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  // Mark mounted and resolve the real screen size in the same effect (rather
  // than a `mounted`-gated follow-up effect) so mobile devices only get one
  // extra render pass instead of two before the sidebar/drawer split is
  // correct — cuts down the visible desktop-sidebar flash on phone loads.
  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile); // Hidden on mobile by default, open on desktop
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load saved theme - only run on client
  useEffect(() => {
    if (!mounted) return;

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, [mounted]);

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    if (!mounted) return;

    let scrollElement: HTMLElement | null = null;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop =
        target.scrollTop ||
        window.scrollY ||
        document.documentElement.scrollTop;

      // Show button when scrolled down more than 200px
      if (scrollTop > 200) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    // Try to find the scrolling element
    const mainContent = mainContentRef.current;

    if (mainContent) {
      // Check if this element scrolls
      const hasScroll = mainContent.scrollHeight > mainContent.clientHeight;

      if (hasScroll) {
        scrollElement = mainContent;
      }
    }

    // If mainContent doesn't scroll, try parent elements
    if (!scrollElement && mainContent) {
      let parent = mainContent.parentElement;
      let level = 0;
      while (parent && level < 5) {
        const hasScroll = parent.scrollHeight > parent.clientHeight;
        if (hasScroll) {
          scrollElement = parent;
          break;
        }
        parent = parent.parentElement;
        level++;
      }
    }

    // Add event listener to the scrolling element
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleScroll({ target: scrollElement } as any);
    } else {
      // Fallback to window scroll
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [mounted]);

  // Scroll to top function
  const scrollToTop = () => {
    // Try scrolling the ref element first
    if (mainContentRef.current) {
      const hasScroll =
        mainContentRef.current.scrollHeight >
        mainContentRef.current.clientHeight;
      if (hasScroll && mainContentRef.current.scrollTop > 0) {
        mainContentRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        return;
      }
    }

    // Otherwise scroll the window
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

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
        <div className="text-primary">{t.admin.loading}</div>
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

  // Subscription-based lock (trial/paid period lapsed past its grace period).
  // The subscription page itself is always reachable so the owner can pay.
  const isSubscriptionRoute = pathname?.startsWith("/dashboard/subscription") ?? false;
  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-4">
        <Spin size="large" />
        <div className="text-primary">{t.admin.loading}</div>
      </div>
    );
  }
  const accessState = getSubscriptionAccessState(subscription);
  if (!isSubscriptionRoute && accessState.state === "locked" && storeId) {
    return (
      <SubscriptionLocked
        storeId={storeId}
        state={accessState.state}
        daysLeftInGrace={accessState.daysLeftInGrace}
      />
    );
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
      <AntdApp
        message={{
          top: 24,
          duration: 2,
          maxCount: 3,
          rtl: false,
          prefixCls: "ant-message",
          getContainer: () => document.body,
        }}
      >
        <div className="h-screen flex flex-col overflow-x-hidden">
          {/* Header */}
          <header
            className="flex flex-wrap items-center justify-between gap-2 p-1 shadow-md sticky top-0 z-50 shrink-0"
            style={{
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
          >
            <div className="flex items-center gap-2 px-2 min-w-0">
              <h1 className="text-lg font-bold truncate max-w-[45vw] sm:max-w-[50vw]">
                {store?.store_name ? `${store.store_name} ` : t.admin.dashboardFallback}
              </h1>

              <button
                onClick={handleSidebarToggle}
                className="p-2 rounded hover:opacity-70 transition-transform duration-300 shrink-0"
                style={{ background: "var(--muted)" }}
              >
                <PanelLeft
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isMobile || !isSidebarOpen ? "rotate-0" : "rotate-180"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <LanguageSwitcher />
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
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition shrink-0"
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

          <div className="flex flex-1 min-h-0">
            {/* Desktop Sidebar - Hidden on mobile */}
            {!isMobile && (
              <div
                className="sticky top-0 h-full shadow-md transition-all duration-300"
                style={{ background: "var(--sidebar)" }}
              >
                <Sidebar collapsed={!isSidebarOpen} themeMode={theme} />
              </div>
            )}

            {/* Mobile Drawer for Sidebar - Now takes 100% width */}
            <Drawer
              title={t.admin.menu}
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
              className="flex-1 flex flex-col overflow-auto min-h-0 min-w-0 relative"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <Toaster position="top-right" />

              {accessState.state === "grace" && (
                <GracePeriodBanner daysLeftInGrace={accessState.daysLeftInGrace} />
              )}

              <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <Breadcrumb />
                {store && storeStatus && (
                  <StoreStatusPopup
                    status={storeStatus}
                    isActive={storeIsActive}
                    createdAt={store.created_at}
                    trialEndsAt={subscription?.trial_ends_at}
                  />
                )}
              </div>

              <div
                className="flex-1 p-3 bg-gray-50 dark:bg-gray-950"
                ref={mainContentRef}
              >
                {children}
              </div>
            </main>
          </div>

          {/* Back to Top Button - Only visible after scrolling down */}
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-4 right-2 p-4 rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110"
              style={{
                background: "#3b82f6",
                color: "#ffffff",
                zIndex: 9999,
              }}
              aria-label="Back to top"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
          )}
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

//layout
