import { ProtectedShell } from "@/components/layout/protected-shell";
import { platformNav, platformViewerNav } from "@/components/layout/nav-config";
import { getCachedSession } from "@/lib/auth-session";

type PlatformLayoutProps = {
  children: React.ReactNode;
};

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const session = await getCachedSession();
  const isLearner = session?.user.role === "LEARNER";

  return (
    <ProtectedShell
      navTitle={isLearner ? "Espace apprenant" : "Vue apprenant"}
      headerTitle={isLearner ? "Plateforme" : "Catalogue des cours"}
      navItems={isLearner ? platformNav : platformViewerNav}
      workspace="platform"
    >
      {children}
    </ProtectedShell>
  );
}
