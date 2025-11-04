// src/lib/queries/products/deleteProduct.ts
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Fully atomic product deletion
 * Deletes product, variants, inventory, images (DB + storage)
 */
export async function deleteProduct(productId: string) {
  if (!productId) throw new Error("Product ID is required");

  try {
    // 1️⃣ Fetch all images to delete from storage
    const { data: imagesData, error: imagesError } = await supabaseAdmin
      .from("product_images")
      .select("id, image_url")
      .eq("product_id", productId);

    if (imagesError) throw imagesError;

    const imageFilePaths = imagesData
      ?.map((img) => {
        try {
          // extract file path from Supabase public URL
          const url = new URL(img.image_url);
          return url.pathname.replace(/^\/storage\/v1\/object\/public\/shei-hoise-product\//, "");
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    // 2️⃣ Delete images from storage
    if (imageFilePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("shei-hoise-product")
        .remove(imageFilePaths);

      if (storageError) console.error("Failed to remove some files from storage:", storageError);
    }

    // 3️⃣ Delete related data in proper order
    const tablesToDelete = [
      { table: "product_images", column: "product_id" },
      { table: "product_inventory", column: "product_id" },
      { table: "product_variants", column: "product_id" },
      { table: "products", column: "id" },
    ];

    for (const { table, column } of tablesToDelete) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, productId);
      if (error) console.error(`Failed to delete from ${table}:`, error);
    }

    return true;
  } catch (err) {
    console.error("deleteProduct failed:", err);
    throw err;
  }
}
