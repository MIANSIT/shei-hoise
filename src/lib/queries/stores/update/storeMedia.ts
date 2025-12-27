import { supabaseAdmin } from "@/lib/supabase";

type MediaType = "logo" | "banner";

export async function uploadStoreMedia(
  storeId: string,
  file: File,
  type: MediaType,
  oldFileUrl?: string // optional: previous file URL to remove
): Promise<string | null> {
  const bucket = type === "logo" ? "store_logo" : "store-banner";

  // 1️⃣ Remove old file if oldFileUrl is provided
  if (oldFileUrl) {
    try {
      // Extract path from full URL
      const url = new URL(oldFileUrl);
      let oldPath = url.pathname;
      // Supabase bucket paths usually start after "/storage/v1/object/public/{bucket}/"
      const bucketPrefix = `/object/public/${bucket}/`;
      if (oldPath.includes(bucketPrefix)) {
        oldPath = oldPath.split(bucketPrefix)[1];
        await supabaseAdmin.storage.from(bucket).remove([oldPath]);
      }
    } catch (err) {
      console.warn("Failed to remove old file:", err);
    }
  }

  // 2️⃣ Generate unique filename
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const path = `store/${storeId}/${type}-${uniqueId}.png`;

  // 3️⃣ Upload new file
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.error(`Error uploading ${type}:`, error);
    return null;
  }

  // 4️⃣ Return new public URL
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
