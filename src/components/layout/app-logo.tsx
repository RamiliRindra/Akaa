import Image from "next/image";
import Link from "next/link";

import logoAkaa from "@/img/logo_akaa.png";

type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <Image
        src={logoAkaa}
        alt="Logo Akaa"
        width={compact ? 28 : 36}
        height={compact ? 28 : 36}
        className="h-auto w-auto"
        priority
      />
      {!compact ? (
        <span className="text-xl font-bold tracking-tight text-[#0c0910]">Akaa</span>
      ) : null}
    </Link>
  );
}
