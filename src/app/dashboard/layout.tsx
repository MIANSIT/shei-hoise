"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Sidebar from "../components/admin/sidebar/Sidebar";
import ProtectedRoute from "../components/common/ProtectedRoute";
import { PanelLeft } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // sidebar state

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Detect screen size and auto-open sidebar on desktop
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

            {/* Logo and title */}
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Logo" width={30} height={30} />
              <h1 className="text-lg font-semibold">Shei Hoise</h1>
            </div>
          </div>

          {/* Right side (optional) */}
          <div>
            {/* Add profile, notifications, etc. here */}
          </div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <Sidebar collapsed={!isSidebarOpen} />

          {/* Main content */}
          <main className="flex-1 ">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
