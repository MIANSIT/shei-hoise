"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import FormField from "./addProducts/FormField";
import PriceFields from "./addProducts/PriceFields";
import StockFields from "./addProducts/StockFields";
import PicturesWallUploader from "./addProducts/PicturesWallUploader";
import ImageUploader from "./addProducts/ImageUploader";
import { useZodForm } from "../../../../../lib/utils/useZodForm";
import {
  adminProductSchema,
  ProductFormValues,
} from "../../../../../lib/utils/formSchema";
import { UseFormReturn } from "react-hook-form";

interface ProductPageFormProps {
  product?: ProductFormValues;
  onSubmit: (product: ProductFormValues) => void;
}

// Reusable error message component with proper typing
const ErrorMessage: React.FC<{
  field: keyof ProductFormValues;
  form: UseFormReturn<ProductFormValues>;
}> = ({ field, form }) => {
  const error = form.formState.errors[field];
  return error ? <p className="text-red-400 text-sm">{error.message}</p> : null;
};

const AddProductForm: React.FC<ProductPageFormProps> = ({
  product,
  onSubmit,
}) => {
  const form = useZodForm<ProductFormValues>(adminProductSchema, {
    title: "",
    category: "",
    currentPrice: "",
    originalPrice: "",
    discount: 0,
    stock: 0,
    images: [],
  });

  useEffect(() => {
    if (product) form.reset(product);
  }, [product, form]);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  const images = form.watch("images");

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg text-gray-100 shadow-lg">
      <h1 className="text-2xl font-bold mb-6">
        {product ? "Edit Product" : "Add Product"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <FormField
          label="Title"
          name="title"
          value={form.watch("title")}
          onChange={(e) => form.setValue("title", e.target.value)}
          placeholder="Enter product title"
          error={form.formState.errors.title?.message} // 👈 inline error
        />

        {/* Category */}
        <FormField
          label="Category"
          name="category"
          value={form.watch("category")}
          onChange={(e) => form.setValue("category", e.target.value)}
          placeholder="Enter product category"
          error={form.formState.errors.category?.message} // 👈 inline error
        />

        {/* Prices */}
        <PriceFields
          currentPrice={form.watch("currentPrice")}
          originalPrice={form.watch("originalPrice")}
          onChange={(e) =>
            form.setValue(
              e.target.name as keyof ProductFormValues,
              e.target.value
            )
          }
          errors={{
            currentPrice: form.formState.errors.currentPrice?.message,
            originalPrice: form.formState.errors.originalPrice?.message,
          }}
        />

        {/* Stock & Discount */}
        <StockFields
          discount={form.watch("discount")}
          stock={form.watch("stock")}
          onChange={(e) =>
            form.setValue(
              e.target.name as keyof ProductFormValues,
              e.target.value
            )
          }
          errors={{
            discount: form.formState.errors.discount?.message,
            stock: form.formState.errors.stock?.message,
          }}
        />

        {/* Images */}
        {images.length === 0 ? (
          <ImageUploader
            images={images}
            setImages={(files) => form.setValue("images", files)}
            error={form.formState.errors.images?.message} // 👈 pass error
          />
        ) : (
          <PicturesWallUploader
            images={images}
            setImages={(files) => form.setValue("images", files)}
          />
        )}

        {/* Submit */}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            {product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;
