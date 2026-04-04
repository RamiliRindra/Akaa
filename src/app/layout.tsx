import type { Metadata } from "next";
import "@mdxeditor/editor/style.css";
import { Inter, Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Akaa",
    template: "%s | Akaa",
  },
  description: "Plateforme e-learning gamifiée pour apprendre, progresser et célébrer chaque étape.",
  openGraph: {
    title: "Akaa",
    description: "Plateforme e-learning gamifiée pour apprendre, progresser et célébrer chaque étape.",
    type: "website",
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--color-background)] text-[var(--color-text)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
