"use client";

import React from "react";
import ProductRow from "./ProductRow";

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

interface ProductTableProps {
  products: Product[];
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  return (
    <table className="min-w-full border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <thead>
        <tr className="bg-white group hover:bg-black transition-colors">
          {[
            "Image",
            "Title",
            "Category",
            "Price",
            "Discount",
            "Stock",
            "Actions",
          ].map((title) => (
            <th
              key={title}
              className="text-center text-lg font-bold uppercase py-2 text-black group-hover:text-white transition-colors"
            >
              {title}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </tbody>
    </table>
  );
};

export default ProductTable;
