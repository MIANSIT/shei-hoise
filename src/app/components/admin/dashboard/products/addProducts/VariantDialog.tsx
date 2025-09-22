"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormField from "./FormField";
import { ProductVariantType } from "@/lib/schema/varientSchema";

interface VariantDialogProps {
  open: boolean;
  variant?: ProductVariantType;
  onClose: () => void;
  onSave: (variant: ProductVariantType) => void;
  mainProductStock: number;
  existingVariants: ProductVariantType[];
}

const VariantDialog: React.FC<VariantDialogProps> = ({ open, variant, onClose, onSave, mainProductStock, existingVariants }) => {
  const [variantName, setVariantName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(0);
  const [weight, setWeight] = useState<number | undefined>(0);
  const [color, setColor] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [stock, setStock] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (variant) {
      setVariantName(variant.variant_name);
      setSku(variant.sku || "");
      setPrice(variant.price || 0);
      setWeight(variant.weight || 0);
      setColor(variant.color || "");
      setAttributes(variant.attributes || {});
      setIsActive(variant.is_active ?? true);
      setStock(variant.stock ?? 0);
    } else {
      setVariantName("");
      setSku("");
      setPrice(0);
      setWeight(0);
      setColor("");
      setAttributes({});
      setIsActive(true);
      setStock(0);
    }
    setError("");
  }, [variant]);

  // Validate variant stock against main product stock
  useEffect(() => {
    const totalOtherVariantStock = existingVariants
      .filter((v) => v !== variant)
      .reduce((acc, v) => acc + (v.stock ?? 0), 0);

    if (stock + totalOtherVariantStock > mainProductStock) {
      setError(`Total variant stock (${totalOtherVariantStock + stock}) exceeds main product stock (${mainProductStock})`);
    } else {
      setError("");
    }
  }, [stock, existingVariants, variant, mainProductStock]);

  const handleSave = () => {
    if (!variantName) return;
    if (error) return;

    onSave({
      variant_name: variantName,
      sku,
      price,
      weight,
      color,
      attributes,
      is_active: isActive,
      stock,
      product_id: variant?.product_id,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{variant ? "Edit Variant" : "Add Variant"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Variant Name" name="variantName" value={variantName} onChange={(e) => setVariantName(e.target.value)} />
          <FormField label="SKU" name="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          <FormField label="Price" name="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
          <FormField label="Weight" name="weight" type="number" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value))} />
          <FormField label="Color" name="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <FormField label="Stock" name="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value))} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <FormField label="Attributes (JSON)" name="attributes" as="textarea" value={JSON.stringify(attributes, null, 2)} onChange={(e) => {
            try { const parsed = JSON.parse(e.target.value); if (typeof parsed === "object" && parsed !== null) setAttributes(parsed); } catch {}
          }} />
          <FormField label="Active" name="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive((e.target as HTMLInputElement).checked)} />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="greenish" disabled={!!error}>{variant ? "Update" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariantDialog;
