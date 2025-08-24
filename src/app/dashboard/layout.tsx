// app/dashboard/layout.tsx
"use client";

import React from "react";
import Sidebar from "../components/admin/sidebar/Sidebar";
import Header from "../components/common/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header on top */}
      <Header isAdmin={true} />

      {/* Content area */}
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
