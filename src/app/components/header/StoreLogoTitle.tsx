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
          priority
        />
      ) : (
        <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
          <span className="text-xs font-bold">
            {storeName?.[0]?.toUpperCase() || "S"}
          </span>
        </div>
      )}
      {showTitle && <span className="text-xl font-bold">{storeName}</span>}
    </Link>
  );
}
