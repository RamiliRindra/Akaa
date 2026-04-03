import type { Metadata } from "next";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akaa",
  description: "Plateforme e-learning gamifiée",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f9ff] text-[#0c0910]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
