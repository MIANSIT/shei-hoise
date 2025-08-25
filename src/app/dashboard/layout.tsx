"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Header from "../components/common/Header";
import ProtectedRoute from "../components/common/ProtectedRoute";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // initially closed on mobile
  const [isDesktop, setIsDesktop] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Detect if screen is desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true); // open sidebar on desktop
        setIsDesktop(true);
      } else {
        setIsSidebarOpen(false); // close sidebar on mobile
        setIsDesktop(false);
      }
    };

    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-black">
        {/* Responsive Header (mobile + desktop) */}
        <Header isAdmin={true} onSidebarToggle={toggleSidebar} />

        <div className="flex flex-1">
          {/* Sidebar */}
          {isSidebarOpen && <Sidebar />}

          {/* Main content */}
          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
