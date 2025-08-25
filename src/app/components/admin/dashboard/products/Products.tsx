"use client";

import React from "react";
import Pagination from "../../../ui/sheiPagination/Pagination";
import ProductTable from "./ProductTable";
import { dummyProducts } from "../../../../../lib/store/dummyProducts";

const ITEMS_PER_PAGE = 10;

const Products: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(dummyProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = dummyProducts.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      <ProductTable products={paginatedProducts} />

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
