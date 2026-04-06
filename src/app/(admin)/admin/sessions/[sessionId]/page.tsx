import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { getCachedSession } from "@/lib/auth-session";
import { getTrainingSessionForStaff } from "@/lib/session-access";

type AdminSessionDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AdminSessionDetailPage({ params }: AdminSessionDetailPageProps) {
  const { sessionId } = await params;
  const session = await getCachedSession();

  if (!session?.user?.id) {
    notFound();
  }

  const trainingSession = await getTrainingSessionForStaff(sessionId);

  if (!trainingSession) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SessionDetailPanel
        session={trainingSession}
        enrollment={null}
        returnTo={`/admin/sessions/${sessionId}`}
        backHref="/admin/calendar"
        showEnrollForm={false}
      />
      <Link
        href="/admin/calendar"
        className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
      >
        Retour au calendrier admin
      </Link>
    </div>
  );
}
