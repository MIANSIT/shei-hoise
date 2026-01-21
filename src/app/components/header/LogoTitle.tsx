import Link from "next/link";
import Image from "next/image";

interface LogoTitleProps {
  showTitle?: boolean;
}

export default function LogoTitle({ showTitle = false }: LogoTitleProps) {
  return (
    <Link href="/" className="flex items-center gap-2 hover:text-primary">
      <Image src="/logo_beta.png" alt="Logo" width={32} height={32} priority />

      <span className="text-xl font-bold flex items-center gap-1">
        Shei Hoise
        {/* Superscript Beta badge */}
        <span
          className="text-[10px] font-semibold text-white 
                 bg-linear-to-r from-teal-400 to-blue-500 
                 rounded-md px-1 -translate-y-1 shadow-md 
                 uppercase tracking-wider"
        >
          Beta
        </span>
      </span>
    </Link>
  );
}
