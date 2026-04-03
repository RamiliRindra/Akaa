import { ProtectedShell } from "@/components/layout/protected-shell";
import { platformNav } from "@/components/layout/nav-config";

type PlatformLayoutProps = {
  children: React.ReactNode;
};

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <ProtectedShell navTitle="Espace apprenant" headerTitle="Plateforme" navItems={platformNav}>
      {children}
    </ProtectedShell>
  );
}
