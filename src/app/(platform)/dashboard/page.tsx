import { redirect } from "next/navigation";

import { PlaceholderCard } from "@/components/layout/placeholder-card";
import { getHomePathForRole } from "@/lib/auth-config";
import { auth } from "@/lib/auth";

export default async function LearnerDashboardPage() {
  const session = await auth();

  if (session?.user?.role === "TRAINER" || session?.user?.role === "ADMIN") {
    redirect(getHomePathForRole(session.user.role));
  }

  return (
    <PlaceholderCard
      title="Dashboard apprenant"
      description="Cette zone affichera XP, streak, progression et recommandations de cours (Phase 3+)."
    />
  );
}
