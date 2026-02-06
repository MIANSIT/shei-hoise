import Link from "next/link";
import Image from "next/image";

interface StoreLogoTitleProps {
  storeSlug: string;
  storeName?: string;
  logoUrl?: string | null;
  showTitle?: boolean;
}

export default function StoreLogoTitle({
  storeSlug,
  storeName,
  logoUrl,
  showTitle = true,
}: StoreLogoTitleProps) {
  // Get first letter of store name or fallback to "S"
  const firstLetter = storeName?.[0]?.toUpperCase() || "S";

  return (
    <Link
      href={`/${storeSlug}`}
      className="flex items-center gap-2 hover:text-gray-400"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={storeName || "Store Logo"}
          width={32}
          height={32}
          className="rounded-full"
          priority
        />
      ) : (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700">{firstLetter}</span>
        </div>
      )}
      {showTitle && storeName && (
        <span className="text-xl font-bold text-foreground">{storeName}</span>
      )}
    </Link>
  );
}
