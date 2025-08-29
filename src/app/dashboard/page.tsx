"use client";

import { Dashboard } from "../components/admin/dashboard/MainDashboard";

export default function DashboardPage() {
  return (
      <div className="p-6">
        {/* Add breadcrumb at the top */}

        {/* Your main dashboard component */}
        <Dashboard name="Shah Nawrose" />
      </div>
  );
}
