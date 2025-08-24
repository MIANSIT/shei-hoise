// app/admin/dashboard/page.tsx (or wherever your page is)
import Header from "../components/common/Header";
import { Dashboard } from "../components/admin/dashboard/dashboardCom";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <Header isAdmin={true} />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center">
        <Dashboard name="Shah Nawrose" />
      </main>
    </div>
  );
}
