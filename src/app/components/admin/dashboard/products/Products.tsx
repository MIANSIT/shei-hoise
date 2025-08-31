import React from "react";
import ProductTable from "./ProductTable";
import { dummyProducts } from "../../../../../lib/store/dummyProducts";

const Products: React.FC = () => {
  return (
    <div className="">
      <ProductTable products={dummyProducts} />
    </div>
  );
};

export default Products;

// "use client";

// // import React, { useEffect, useState } from "react";
// import React, { useState } from "react";
// import ProductTable from "./ProductTable";
// import { dummyProducts } from "../../../../../lib/store/dummyProducts";

// const Products: React.FC = () => {
//   const [products, setProducts] = useState(dummyProducts);
//   const [loading, setLoading] = useState(false); // ready for future fetch

//   // Example: future API fetch structure
//   /*
//   useEffect(() => {
//     const fetchProducts = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch("/api/products");
//         const data = await res.json();
//         setProducts(data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchProducts();
//   }, []);
//   */

//   return (
//     <div className="p-6">
//       <ProductTable products={products} loading={loading} />
//     </div>
//   );
// };

// export default Products;
