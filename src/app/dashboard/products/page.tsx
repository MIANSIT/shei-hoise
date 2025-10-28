"use client";

import Products from "@/app/components/admin/dashboard/products/MainProduct/Products";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

export default function ProductsPage() {
  const router = useRouter();

  const handleAddProduct = () => {
    router.push("/dashboard/products/add-product");
  };

  return (
    <div className="">
      <div className="flex justify-end  mb-6">
        <SheiButton
          onClick={handleAddProduct}
          title="Add Product"
          type="primary"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-transform transform hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </SheiButton>
      </div>

      <Products />
    </div>
  );
}
