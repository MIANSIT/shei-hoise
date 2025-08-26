"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormField from "./addProducts/FormField";
import PriceFields from "./addProducts/PriceFields";
import StockFields from "./addProducts/StockFields";
import PicturesWallUploader from "./addProducts/PicturesWallUploader";
import ImageUploader from "./addProducts/ImageUploader";

export interface Product {
  id?: number;
  title: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  discount: number | string;
  stock: number | string;
  images: (File | string)[]; // ✅ support URLs or File objects
}

interface ProductPageFormProps {
  product?: Product;
  onSubmit: (product: Product) => void;
}

const AddProducts: React.FC<ProductPageFormProps> = ({ product, onSubmit }) => {
  const [formData, setFormData] = useState<Product>({
    title: "",
    category: "",
    currentPrice: "",
    originalPrice: "",
    discount: "",
    stock: "",
    images: [],
  });

  useEffect(() => {
    if (product) setFormData(product);
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "discount" || name === "stock"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      discount: Number(formData.discount),
      stock: Number(formData.stock),
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg  text-white">
      <h1 className="text-2xl font-bold mb-6">
        {product ? "Edit Product" : "Add Product"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter product title"
          required
        />

        <FormField
          label="Category"
          name="category"
          value={formData.category}
          placeholder="Enter product category"
          onChange={handleChange}
          required
        />

        <PriceFields
          currentPrice={formData.currentPrice}
          originalPrice={formData.originalPrice}
          onChange={handleChange}
        />

        <StockFields
          discount={formData.discount}
          stock={formData.stock}
          onChange={handleChange}
        />

        {/* ✅ Pictures Wall Uploader */}
        {formData.images.length === 0 ? (
          <ImageUploader
            images={formData.images}
            setImages={(files) =>
              setFormData((prev) => ({ ...prev, images: files }))
            }
          />
        ) : (
          <PicturesWallUploader
            images={formData.images}
            setImages={(files) =>
              setFormData((prev) => ({ ...prev, images: files }))
            }
          />
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button type="submit">
            {product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProducts;
