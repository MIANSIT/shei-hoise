import Link from "next/link";
import Image from "next/image";

interface LogoTitleProps {
  showTitle?: boolean; // show title text for admin
  isAdmin?: boolean;   // ✅ new prop
}

export default function LogoTitle({ showTitle = false, isAdmin = false }: LogoTitleProps) {
  const href = isAdmin ? "/dashboard" : "/";

  return (
    <Link href={href} className="flex items-center gap-2 hover:text-white">
      <Image src="/logo.png" alt="Logo" width={32} height={32} priority />
      {showTitle && <span className="text-xl font-bold ">Shei Hoise Dashboard</span>}
    </Link>
  );
}
