import React from "react";
import ProductTable from "./ProductTable";
import { dummyProducts } from "@/lib/store/dummyProducts";

const Products: React.FC = () => {
  return (
    <div className="">
      <ProductTable products={dummyProducts} />
    </div>
  );
};

export default Products;