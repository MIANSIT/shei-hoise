// app/dashboard/layout.tsx
"use client";

import React from "react";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Header from "../components/common/Header";
import ProtectedRoute from "../components/common/ProtectedRoute";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-black">
        {/* Header */}
        <Header isAdmin={true} />

        {/* Sidebar + main content */}
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
