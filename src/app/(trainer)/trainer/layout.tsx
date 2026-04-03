import { ProtectedShell } from "@/components/layout/protected-shell";
import { trainerNav } from "@/components/layout/nav-config";

type TrainerLayoutProps = {
  children: React.ReactNode;
};

export default async function TrainerLayout({ children }: TrainerLayoutProps) {
  return (
    <ProtectedShell navTitle="Espace formateur" headerTitle="Formateur" navItems={trainerNav}>
      {children}
    </ProtectedShell>
  );
}
