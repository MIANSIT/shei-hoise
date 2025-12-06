"use client";

import Products from "@/app/components/admin/dashboard/products/MainProduct/Products";
// import { useRouter } from "next/navigation";
// import { Plus } from "lucide-react";
// import SheiButton from "@/app/components/ui/SheiButton/SheiButton";

export default function ProductsPage() {
  // const router = useRouter();

  return (
    <div className="">
      <div className="flex justify-end  mb-6"></div>

      <Products />
    </div>
  );
}
