"use client";

import React, { useEffect, useState } from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import { productSchema, ProductType, ProductVariantType } from "@/lib/schema/productSchema";
import FormField from "./FormField";
import VariantDialog from "./VariantDialog";
import { Button } from "@/components/ui/button";
import ImageUploader from "./ImageUploader";
import PicturesWallUploader from "./PicturesWallUploader";
import { getCategoriesQuery } from "../../../../../../lib/queries/categories/getCategories";

interface AddProductFormProps {
  product?: ProductType;
  storeId: string;
  onSubmit: (product: ProductType) => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({ product, storeId, onSubmit }) => {
  const form = useZodForm<ProductType>(productSchema, {
    store_id: storeId,
    category_id: "",
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    basePrice: 0,
    tpPrice: 0,
    discountedPrice: 0,
    discountAmount: 0,
    weight: 0,
    sku: "",
    variants: [],
    images: [],
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantType | undefined>(undefined);

  const images = form.watch("images") || [];

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await getCategoriesQuery(storeId);
      setCategories(data ?? []);
    };
    fetchCategories();
  }, [storeId]);

  // Sync product name -> slug
  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name === "name") {
        const slugValue = values.name
          ? values.name.toLowerCase().trim()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
          : "";
        form.setValue("slug", slugValue);
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Load product if editing
  useEffect(() => {
    if (product) form.reset(product);
  }, [product, form]);

  // Handle variant save
  const handleVariantSave = (variant: ProductVariantType) => {
    const variants = form.getValues("variants") || [];
    const updated = editingVariant
      ? variants.map((v) => (v === editingVariant ? variant : v))
      : [...variants, variant];
    form.setValue("variants", updated);
    setEditingVariant(undefined);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Name */}
        <FormField
          label="Product Name"
          name="name"
          value={form.watch("name")}
          onChange={(e) => form.setValue("name", e.target.value)}
        />

        {/* Slug */}
        <FormField
          label="Slug"
          name="slug"
          value={form.watch("slug")}
          onChange={(e) => form.setValue("slug", e.target.value)}
          readOnly
        />

        {/* Category */}
        <FormField
          label="Category"
          name="categoryId"
          as="select"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={form.watch("category_id") ?? ""}
          onChange={(e) => form.setValue("category_id", e.target.value)}
        />

        {/* Description */}
        <FormField
          label="Description"
          name="description"
          as="textarea"
          value={form.watch("description") ?? ""}
          onChange={(e) => form.setValue("description", e.target.value)}
        />

        {/* Short Description */}
        <FormField
          label="Short Description"
          name="shortDescription"
          as="textarea"
          value={form.watch("shortDescription") ?? ""}
          onChange={(e) => form.setValue("shortDescription", e.target.value)}
        />

        {/* Base Price */}
        <FormField
          label="Base Price"
          name="basePrice"
          type="number"
          value={form.watch("basePrice")}
          onChange={(e) => form.setValue("basePrice", parseFloat(e.target.value))}
        />

        {/* TP Price */}
        <FormField
          label="TP Price"
          name="tpPrice"
          type="number"
          value={form.watch("tpPrice")}
          onChange={(e) => form.setValue("tpPrice", parseFloat(e.target.value))}
        />

        {/* Discounted Price */}
        <FormField
          label="Discounted Price"
          name="discountedPrice"
          type="number"
          value={form.watch("discountedPrice")}
          onChange={(e) => form.setValue("discountedPrice", parseFloat(e.target.value))}
        />

        {/* Discount Amount */}
        <FormField
          label="Discount Amount"
          name="discountAmount"
          type="number"
          value={form.watch("discountAmount")}
          onChange={(e) => form.setValue("discountAmount", parseFloat(e.target.value))}
        />

        {/* Weight */}
        <FormField
          label="Weight"
          name="weight"
          type="number"
          value={form.watch("weight") ?? ""}
          onChange={(e) => form.setValue("weight", parseFloat(e.target.value))}
        />

        {/* SKU */}
        <FormField
          label="SKU"
          name="sku"
          value={form.watch("sku")}
          onChange={(e) => form.setValue("sku", e.target.value)}
        />

        {/* Variants */}
        <div className="col-span-1 md:col-span-2 flex flex-col space-y-2">
          <label className="text-sm font-medium">Variants</label>
          <div className="flex gap-2 flex-wrap">
            {(form.watch("variants") || []).map((v, idx) => (
              <Button
                key={idx}
                type="button"
                variant="accent"
                onClick={() => { setEditingVariant(v); setVariantDialogOpen(true); }}
              >
                {v.variant_name}
              </Button>
            ))}
            <Button type="button" variant="destructive" onClick={() => setVariantDialogOpen(true)}>
              + Add Variant
            </Button>
          </div>
        </div>

        {/* Images */}
        <div className="col-span-1 md:col-span-2">
          {images.length === 0 ? (
            <ImageUploader images={images} setImages={(files) => form.setValue("images", files)} />
          ) : (
            <PicturesWallUploader images={images} setImages={(files) => form.setValue("images", files)} />
          )}
        </div>

        {/* Submit */}
        <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            {product ? "Update Product" : "Save Product"}
          </Button>
        </div>
      </form>

      {/* Variant Dialog */}
      <VariantDialog
        open={variantDialogOpen}
        variant={editingVariant}
        onClose={() => { setVariantDialogOpen(false); setEditingVariant(undefined); }}
        onSave={handleVariantSave}
      />
    </div>
  );
};

export default AddProductForm;
