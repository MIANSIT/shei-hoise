"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Toaster } from "@/app/components/ui/sheiSonner/sonner";
import { PanelLeft, Sun, Moon } from "lucide-react";
import { ConfigProvider, theme as antdTheme, App as AntdApp, Spin } from "antd";
import "@ant-design/v5-patch-for-react-19";
import "antd/dist/reset.css";
import { useSupabaseAuth } from "../../lib/hook/userCheckAuth";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { USERTYPE } from "@/lib/types/users";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const { session, loading } = useSupabaseAuth();
  const router = useRouter();
  const { role } = useCurrentUser();

  // Set mounted to true after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if no session
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/admin-login");
    }
    if (role !== undefined && role !== USERTYPE.STORE_OWNER) {
      router.push("/");
    }
  }, [loading, session, router, role]);

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

  // Toggle light/dark mode
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Show loading state
  if (loading || (!loading && !session) || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-4">
        <Spin size="large" />
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
        <div
          className='min-h-screen flex flex-col'
          style={{ background: "var(--background)", color: "var(--foreground)" }}
        >
          {/* Header */}
          <header
            className='flex items-center justify-between p-4 shadow-md'
            style={{ background: "var(--card)", color: "var(--card-foreground)" }}
          >
            <div className='flex items-center gap-2'>
              <Image src='/logo.png' alt='Logo' width={40} height={40} />
              <h1 className='text-lg font-bold'>Shei Hoise Dashboard</h1>

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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className='p-2 rounded hover:opacity-70'
              style={{ background: "var(--muted)" }}
            >
              {theme === "light" ? (
                <Moon className='w-5 h-5' />
              ) : (
                <Sun className='w-5 h-5' />
              )}
            </button>
          </header>

          <div className='flex flex-1'>
            {/* Sidebar */}
            <Sidebar collapsed={!isSidebarOpen} themeMode={theme} />

            {/* Main content */}
            <main
              className='flex-1 relative'
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <Toaster position='top-right' />
              <Breadcrumb />
              <div className='mt-4'>{children}</div>
            </main>
          </div>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}