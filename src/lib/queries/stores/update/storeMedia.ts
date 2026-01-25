import { supabaseAdmin } from "@/lib/supabase";

type MediaType = "logo" | "banner";

export async function uploadStoreMedia(
  storeId: string,
  file: File,
  type: MediaType,
): Promise<string | null> {
  const bucket = type === "logo" ? "store_logo" : "store-banner";

  try {
    // 1️⃣ List existing files in the store folder for this media type
    const folderPath = `store/${storeId}/`;
    const { data: existingFiles } = await supabaseAdmin.storage
      .from(bucket)
      .list(folderPath);

    // 2️⃣ Remove previous files of this type
    if (existingFiles?.length) {
      const filesToRemove = existingFiles
        .filter((f) => f.name.startsWith(type)) // only remove logos or banners
        .map((f) => `${folderPath}${f.name}`);

      if (filesToRemove.length) {
        await supabaseAdmin.storage.from(bucket).remove(filesToRemove);
      }
    }

    // 3️⃣ Generate a unique filename for the new upload
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const path = `store/${storeId}/${type}-${uniqueId}.png`;

    // 4️⃣ Upload new file
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

    // 5️⃣ Return public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`Error in uploadStoreMedia for ${type}:`, err);
    return null;
  }
}
