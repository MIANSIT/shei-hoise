import Link from "next/link";
import Image from "next/image";

interface StoreLogoTitleProps {
  storeSlug: string; // pass store slug
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
    <Link href={`/${storeSlug}`} className="flex items-center gap-2 hover:text-gray-400">
      <Image
        src={logoUrl || "/logo.png"}
        alt={storeName || "Logo"}
        width={32}
        height={32}
        priority
      />
      {showTitle && (
        <span className="text-xl font-bold">{storeName || "Shei Hoise"}</span>
      )}
    </Link>
  );
}
