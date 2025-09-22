"use client";
import React, { useEffect, useState } from "react";
import { useZodForm } from "@/lib/utils/useZodForm";
import {
  productSchema,
  ProductType,
  ProductVariantType,
} from "@/lib/schema/productSchema";
import FormField from "./FormField";
import VariantDialog from "./VariantDialog";
import { Button } from "@/components/ui/button";
import ImageUploader from "./ImageUploader";
import PicturesWallUploader from "./PicturesWallUploader";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";

interface AddProductFormProps {
  product?: ProductType;
  storeId: string;
  onSubmit: (product: ProductType) => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({
  product,
  storeId,
  onSubmit,
}) => {
  const form = useZodForm<ProductType>(productSchema, {
    store_id: storeId,
    category_id: "",
    name: "",
    slug: "",
    description: "",
    short_description: "",
    base_price: 0,
    tp_price: 0,
    discounted_price: 0,
    discount_amount: 0,
    weight: 0,
    sku: "",
    stock: 0,
    variants: [],
    images: [],
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantType>();
  const images = form.watch("images") || [];
  const variants = form.watch("variants") || [];

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
          ? values.name
              .toLowerCase()
              .trim()
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

  const handleVariantSave = (variant: ProductVariantType) => {
    const updated = editingVariant
      ? variants.map((v) => (v === editingVariant ? variant : v))
      : [...variants, variant];
    form.setValue("variants", updated);
    setEditingVariant(undefined);
  };

  // Main stock calculation
  const totalVariantStock = variants.reduce(
    (sum, v) => sum + (v.stock ?? 0),
    0
  );
  const isStockEditable = variants.length === 0;

  // Required fields
  const requiredFields = {
    name: form.watch("name"),
    category_id: form.watch("category_id"),
    base_price: form.watch("base_price"),
    tp_price: form.watch("tp_price"),
    sku: form.watch("sku"),
    stock: isStockEditable ? form.watch("stock") : totalVariantStock,
  };

  // Save button disabled
  const isSaveDisabled = Object.values(requiredFields).some(
    (field) => field === "" || field === 0 || field === undefined
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Product Info Card */}
        <div className="col-span-1 md:col-span-2 p-4 border rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Product Info</h2>
          <FormField
            label="Product Name *"
            name="name"
            value={form.watch("name")}
            onChange={(e) => form.setValue("name", e.target.value)}
            error={!form.watch("name") ? "Required" : undefined}
          />
          <FormField
            label="Slug"
            name="slug"
            value={form.watch("slug")}
            readOnly
          />
          <FormField
            label="Category *"
            name="category_id"
            as="select"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.watch("category_id") ?? ""}
            onChange={(e) => form.setValue("category_id", e.target.value)}
            error={!form.watch("category_id") ? "Required" : undefined}
          />
          <FormField
            label="Description"
            name="description"
            as="textarea"
            value={form.watch("description") ?? ""}
            onChange={(e) => form.setValue("description", e.target.value)}
          />
          <FormField
            label="Short Description"
            name="short_description"
            as="textarea"
            value={form.watch("short_description") ?? ""}
            onChange={(e) => form.setValue("short_description", e.target.value)}
          />
        </div>

        {/* Pricing & Stock */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Base Price *"
            name="base_price"
            type="number"
            value={form.watch("base_price")}
            onChange={(e) =>
              form.setValue("base_price", parseFloat(e.target.value))
            }
            error={form.watch("base_price") === 0 ? "Required" : undefined}
          />
          <FormField
            label="TP Price *"
            name="tp_price"
            type="number"
            value={form.watch("tp_price")}
            onChange={(e) =>
              form.setValue("tp_price", parseFloat(e.target.value))
            }
            error={form.watch("tp_price") === 0 ? "Required" : undefined}
          />
          <FormField
            label="Discounted Price"
            name="discounted_price"
            type="number"
            value={form.watch("discounted_price")}
            onChange={(e) =>
              form.setValue("discounted_price", parseFloat(e.target.value))
            }
          />
          <FormField
            label="Discount Amount"
            name="discount_amount"
            type="number"
            value={form.watch("discount_amount")}
            onChange={(e) =>
              form.setValue("discount_amount", parseFloat(e.target.value))
            }
          />
          <FormField
            label="Weight"
            name="weight"
            type="number"
            value={form.watch("weight") ?? ""}
            onChange={(e) =>
              form.setValue("weight", parseFloat(e.target.value))
            }
          />
          <FormField
            label="SKU *"
            name="sku"
            value={form.watch("sku")}
            onChange={(e) => form.setValue("sku", e.target.value)}
            error={!form.watch("sku") ? "Required" : undefined}
          />
          <FormField
            label="Stock *"
            name="stock"
            type="number"
            value={isStockEditable ? form.watch("stock") : totalVariantStock}
            onChange={(e) =>
              isStockEditable &&
              form.setValue("stock", parseInt(e.target.value))
            }
            readOnly={!isStockEditable}
            error={requiredFields.stock === 0 ? "Required" : undefined}
          />
        </div>

        {/* Variants Card */}
        <div className="col-span-1 md:col-span-2 p-4 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Variants</h2>
          {variants.length > 0 ? (
            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center  p-2 rounded"
                >
                  <div>
                    {v.variant_name} (Stock: {v.stock})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingVariant(v);
                        setVariantDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        form.setValue(
                          "variants",
                          variants.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm ">No variants added</p>
          )}
          <Button className="mt-3" variant="outline" onClick={() => setVariantDialogOpen(true)}>
            + Add Variant
          </Button>
        </div>

        {/* Images Card */}
        <div className="col-span-1 md:col-span-2 p-4 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Images</h2>
          {images.length === 0 ? (
            <ImageUploader
              images={images}
              setImages={(files) => form.setValue("images", files)}
            />
          ) : (
            <PicturesWallUploader
              images={images}
              setImages={(files) => form.setValue("images", files)}
            />
          )}
        </div>

        {/* Submit */}
        <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
          <Button
            type="submit"
            className={`bg-green-600 hover:bg-green-700 ${
              isSaveDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSaveDisabled}
          >
            {product ? "Update Product" : "Save Product"}
          </Button>
        </div>
      </form>

      {/* Variant Dialog */}
      <VariantDialog
        open={variantDialogOpen}
        variant={editingVariant}
        onClose={() => {
          setVariantDialogOpen(false);
          setEditingVariant(undefined);
        }}
        onSave={handleVariantSave}
        mainProductStock={form.watch("stock") ?? 0}
        existingVariants={variants}
      />
    </div>
  );
};

export default AddProductForm;
