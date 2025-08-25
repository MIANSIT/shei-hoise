"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { dummyProducts } from "../../../../../lib/store/dummyProducts";
import Pagination from "../../../ui/sheiPagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../ui/sheiTable/Table";

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

const ITEMS_PER_PAGE = 10;

const Products: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(dummyProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = dummyProducts.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      <Table className="min-w-full border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Table Header */}
        <TableHeader>
          <TableRow className="bg-white group hover:bg-black transition-colors">
            {[
              "Image",
              "Title",
              "Category",
              "Price",
              "Discount",
              "Stock",
              "Actions",
            ].map((title) => (
              <TableHead
                key={title}
                className="text-center text-lg text-black group-hover:text-white transition-colors"
              >
                {title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Table Body */}
        <TableBody>
          {paginatedProducts.map((product: Product) => (
            <TableRow
              key={product.id}
              className="group hover:bg-gray-900 transition-colors items-center"
            >
              {/* Image */}
              <TableCell className="text-center py-4 text-black group-hover:text-white transition-colors">
                <div className="w-16 h-16 relative mx-auto">
                  <Image
                    src={product.images[0]}
                    alt={product.title}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              </TableCell>

              {/* Title */}
              <TableCell className="text-center font-medium text-white group-hover:text-white transition-colors">
                {product.title}
              </TableCell>

              {/* Category */}
              <TableCell className="text-center text-white group-hover:text-white transition-colors">
                {product.category}
              </TableCell>

              {/* Price */}
              <TableCell className="text-center group-hover:text-white transition-colors">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-white group-hover:text-white text-lg transition-colors">
                    ₹{product.currentPrice}
                  </span>
                  <span className="line-through text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                    ₹{product.originalPrice}
                  </span>
                </div>
              </TableCell>

              {/* Discount */}
              <TableCell className="text-center text-green-600 font-semibold group-hover:text-green-400 transition-colors">
                {product.discount}%
              </TableCell>

              {/* Stock */}
              <TableCell className="text-center text-white group-hover:text-white transition-colors">
                {product.stock}
              </TableCell>

              {/* Actions */}
              <TableCell className="py-2 text-center align-middle">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        siblingCount={1}
      />
    </div>
  );
};

export default Products;
