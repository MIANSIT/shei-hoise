import Link from "next/link";
import Image from "next/image";

interface LogoTitleProps {
  showTitle?: boolean; // optional text next to logo
}

export default function LogoTitle({ showTitle = false }: LogoTitleProps) {
  return (
    <Link href="/" className="flex items-center gap-2 hover:text-primary">
      <Image src="/logo_beta.png" alt="Logo" width={32} height={32} priority />
      <span className="text-xl font-bold">Shei Hoise</span>
    </Link>
  );
}
