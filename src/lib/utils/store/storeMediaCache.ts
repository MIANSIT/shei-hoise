export function getStoreMediaUrl(url?: string) {
  const fallback = "/images/store-placeholder.png";

  if (!url) return fallback;

  // If it's a blob (from URL.createObjectURL) or already has ?t=, just return as-is
  if (url.startsWith("blob:") || url.includes("?t=")) return url;

  return `${url}?t=${Date.now()}`;
}
