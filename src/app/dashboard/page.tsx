"use client";

import { Dashboard } from "../components/admin/dashboard/MainDashboard";
import Header from "../components/common/Header";
import ProtectedRoute from "../components/common/ProtectedRoute";

export default function DashboardPage() {
  return (
  <ProtectedRoute>
      <div className="min-h-screen bg-black flex flex-col">
        <Header isAdmin={true} />
        <main className="flex-1 flex items-center justify-center">
          <Dashboard name="Shah Nawrose" />
        </main>
      </div>
   </ProtectedRoute>
  );
}
