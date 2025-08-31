import Products from "@/app/components/admin/dashboard/products/Products";

export default function ProductsPage() {
  return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">All Products</h1>
        <Products />
      </div>
  );
}
