import Image from "next/image";
import Link from "next/link";

import logoAkaa from "@/img/logo_akaa.png";

type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 rounded-full px-1 py-1">
      <Image
        src={logoAkaa}
        alt="Logo Akaa"
        width={compact ? 28 : 36}
        height={compact ? 28 : 36}
        className="h-auto w-auto drop-shadow-[0_12px_20px_rgba(15,99,255,0.18)]"
        priority
      />
      {!compact ? (
        <span className="font-display text-xl font-extrabold tracking-tight text-[#0c0910]">Akaa</span>
      ) : null}
    </Link>
  );
}
