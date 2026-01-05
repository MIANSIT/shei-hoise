"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Toaster } from "@/app/components/ui/sheiSonner/sonner";
import { PanelLeft } from "lucide-react";
import { ConfigProvider, theme as antdTheme, App as AntdApp, Spin } from "antd";
import "@ant-design/v5-patch-for-react-19";
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
import { StoreStatus } from "@/lib/types/enums";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const { session, loading: authLoading } = useSupabaseAuth();
  const router = useRouter();
  const { role, storeSlug, storeStatus, storeIsActive, loading: userLoading } = useCurrentUser();

  const [store, setStore] = useState<StoreWithLogo | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);

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

  // Sidebar responsiveness - only run on client
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  // Combined loading states
  const isLoading = authLoading || userLoading || storeLoading;

  // Check if user should be blocked from accessing dashboard
  const shouldBlockAccess = !isLoading && (!storeIsActive || storeStatus === "trial");

  // Show loading state while all data is being fetched
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen flex-col gap-4'>
        <Spin size='large' />
        <div className='text-gray-500'>Loading...</div>
      </div>
    );
  }

  // Show blocked access screen
  if (shouldBlockAccess) {
    if (storeStatus === "trial") {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4'>
          <div className='max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center'>
            {/* Icon */}
            <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100'>
              <svg
                className='h-7 w-7 text-green-700'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 8v4l3 3M12 2a10 10 0 1010 10A10 10 0 0012 2z'
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className='text-xl font-semibold text-gray-900'>
              Your Free Trial Has Ended
            </h1>

            {/* Description */}
            <p className='mt-3 text-sm text-gray-600 leading-relaxed'>
              Thanks for trying our platform! Your trial period has now ended.
            </p>

            <p className='mt-2 text-sm text-gray-600 leading-relaxed'>
              To continue managing your store, accessing orders, customers, and
              analytics, please choose a plan and complete your payment.
            </p>

            {/* Highlight box */}
            <div className='mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800'>
              Your store and data are safe — nothing has been deleted.
            </div>

            {/* Actions */}
            <div className='mt-6 space-y-3'>
              <Link
                href='/contact-us'
                className='inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition'
              >
                Upgrade & Continue
              </Link>
            </div>

            {/* Footer note */}
            <p className='mt-6 text-xs text-gray-500'>
              Need help choosing a plan? Our support team is happy to help.
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4'>
          <div className='max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center'>
            {/* Icon */}
            <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100'>
              <svg
                className='h-7 w-7 text-yellow-700'
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 9v3m0 4h.01M12 2a10 10 0 1010 10A10 10 0 0012 2z'
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className='text-xl font-semibold text-gray-900'>
              Dashboard Access Temporarily Restricted
            </h1>

            {/* Description */}
            <p className='mt-3 text-sm text-gray-600 leading-relaxed'>
              Your dashboard access has been temporarily restricted due to a
              pending payment or subscription issue.
            </p>

            <p className='mt-2 text-sm text-gray-600 leading-relaxed'>
              Your store, data, and customers are completely safe. Once the
              payment is settled, full access will be restored automatically.
            </p>

            {/* Actions */}
            <div className='mt-6 space-y-3'>
              <Link
                href='/contact-us'
                className='inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition'
              >
                Contact Support
              </Link>
            </div>

            {/* Footer note */}
            <p className='mt-6 text-xs text-gray-500'>
              If you believe this is a mistake, please reach out to our support
              team.
            </p>
          </div>
        </div>
      );
    }
  }

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
        },
      }}
    >
      <AntdApp>
        <div className='min-h-screen flex flex-col'>
          {/* Header */}
          <header
            className='flex items-center justify-between p-4 shadow-md shrink-0'
            style={{
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
          >
            <div className='flex items-center gap-2'>
              {store?.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.store_name || "Store Logo"}
                  width={40}
                  height={40}
                  className='rounded-full object-cover'
                />
              ) : (
                <Image src='/logo.png' alt='Logo' width={40} height={40} />
              )}
              <h1 className='text-lg font-bold'>
                {store?.store_name || "Dashboard"}
              </h1>

              <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className='p-2 rounded hover:opacity-70 transition-transform duration-300'
                style={{ background: "var(--muted)" }}
              >
                <PanelLeft
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isSidebarOpen ? "rotate-0" : "rotate-180"
                  }`}
                />
              </button>
            </div>
          </header>

          <div className='flex flex-1 overflow-hidden'>
            {/* Sidebar */}
            <Sidebar collapsed={!isSidebarOpen} themeMode={theme} />

            {/* Main content */}
            <main
              className='flex-1 flex flex-col overflow-hidden'
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <Toaster position='top-right' />

              <div className='flex justify-between items-center mb-4 px-4'>
                <Breadcrumb />
                {store && storeStatus && (
                  <StoreStatusPopup
                    status={storeStatus}
                    isActive={storeIsActive}
                    createdAt={store.created_at}
                  />
                )}
              </div>
              <div className='flex-1 overflow-auto p-4'>{children}</div>
            </main>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}