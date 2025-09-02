"use client";

import React from "react";

interface Product {
  title: string;
  quantity: number;
  price: number;
}

interface Props {
  products: Product[];
}

const TotalPrice: React.FC<Props> = ({ products }) => {
  const total = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  return <span className="font-semibold">${total.toFixed(2)}</span>;
};

export default TotalPrice;
