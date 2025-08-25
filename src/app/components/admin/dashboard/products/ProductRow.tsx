"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Product {
  id: number;
  title: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  discount: number;
  stock: number;
  images: string[];
}

interface ProductRowProps {
  product: Product;
}

const ProductRow: React.FC<ProductRowProps> = ({ product }) => {
  return (
    <tr className="group hover:bg-gray-900 transition-colors">
      {/* Image */}
      <td className="text-center py-4 align-middle text-black group-hover:text-white transition-colors">
        <div className="w-16 h-16 relative mx-auto">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            className="object-cover rounded-md"
          />
        </div>
      </td>

      {/* Title */}
      <td className="text-center font-medium text-white group-hover:text-white transition-colors">
        {product.title}
      </td>

      {/* Category */}
      <td className="text-center text-white group-hover:text-white transition-colors">
        {product.category}
      </td>

      {/* Price */}
      <td className="text-center group-hover:text-white transition-colors">
        <div className="flex flex-col items-center">
          <span className="font-semibold text-white group-hover:text-white text-lg transition-colors">
            ₹{product.currentPrice}
          </span>
          <span className="line-through text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
            ₹{product.originalPrice}
          </span>
        </div>
      </td>

      {/* Discount */}
      <td className="text-center text-green-600 font-semibold group-hover:text-green-400 transition-colors">
        {product.discount}%
      </td>

      {/* Stock */}
      <td className="text-center text-white group-hover:text-white transition-colors">
        {product.stock}
      </td>

      {/* Actions */}
      <td className="py-2 text-center align-middle">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="bg-blue-500 text-white hover:bg-blue-600"
            size="sm"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            className="bg-red-500 text-white hover:bg-red-600"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default ProductRow;
