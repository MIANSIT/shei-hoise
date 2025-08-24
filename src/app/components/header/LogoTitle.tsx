import Link from "next/link";
import Image from "next/image";

interface LogoTitleProps {
  showTitle?: boolean; // show title text for admin
}

export default function LogoTitle({ showTitle = false }: LogoTitleProps) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.png" alt="Logo" width={32} height={32} priority />
      {showTitle && <span className="text-xl font-bold">Shei Hoise</span>}
    </Link>
  );
}
