import Image from "next/image";
import Link from "next/link";

import logoAkaa from "@/img/logo_akaa.png";

type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <Link href="/" className="inline-flex items-center rounded-full px-1 py-1">
      <Image
        src={logoAkaa}
        alt="Logo Akaa"
        width={compact ? 32 : 108}
        height={compact ? 32 : 48}
        className="h-auto w-auto drop-shadow-[0_12px_20px_rgba(15,99,255,0.18)]"
        priority
      />
    </Link>
  );
}
