"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { PanelLeft } from "lucide-react";
import Breadcrumb from "@/app/components/admin/common/Breadcrumb"; // ✅ import
import "@ant-design/v5-patch-for-react-19";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col dark:bg-gray-900">
        {/* Header */}
        <header className="flex items-center justify-between bg-black dark:bg-gray-900 text-white p-4 shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Logo" width={40} height={40} />
              <h1 className="text-lg font-bold">Shei Hoise Dashboard</h1>
            </div>
            {/* Sidebar toggle button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded hover:bg-gray-700 transition-transform duration-300"
            >
              <PanelLeft
                className={`w-5 h-5 transition-transform duration-300 ${
                  isSidebarOpen ? "rotate-0" : "rotate-180"
                }`}
              />
            </button>
          </div>

          {/* Right side (optional) */}
          <div></div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <div>
            <Sidebar collapsed={!isSidebarOpen} />
          </div>
          {/* Main content area */}
          <main className="flex-1 bg-white text-black">
            {/* ✅ Breadcrumb placed here */}
            <Breadcrumb />

            {/* Page content */}
            <div className="mt-4">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
