import Breadcrumb from "@/app/components/admin/common/Breadcrumb";
import Products from "@/app/components/admin/dashboard/products/Products";
import ProtectedRoute from "@/app/components/common/ProtectedRoute";

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <div className="p-6">
        <Breadcrumb />
        <h1 className="text-3xl font-bold mb-6">All Products</h1>
        <Products />
      </div>
    </ProtectedRoute>
  );
}
