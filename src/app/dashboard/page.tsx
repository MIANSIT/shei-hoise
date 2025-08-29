"use client";

import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import { Dashboard } from "../components/admin/dashboard/MainDashboard";
import ProtectedRoute from "../components/common/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
        <div className="p-6">
         {/* Add breadcrumb at the top */}
        <Breadcrumb />

        {/* Your main dashboard component */}
        <Dashboard name="Shah Nawrose" />
      </div>
    </ProtectedRoute>
  );
}
