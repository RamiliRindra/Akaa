import { ProtectedShell } from "@/components/layout/protected-shell";
import { adminNav } from "@/components/layout/nav-config";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedShell navTitle="Administration" headerTitle="Admin" navItems={adminNav}>
      {children}
    </ProtectedShell>
  );
}
