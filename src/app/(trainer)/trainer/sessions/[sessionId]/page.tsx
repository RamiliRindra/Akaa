import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { getCachedSession } from "@/lib/auth-session";
import { getTrainingSessionForStaff } from "@/lib/session-access";

type TrainerSessionDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function TrainerSessionDetailPage({ params }: TrainerSessionDetailPageProps) {
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
        returnTo={`/trainer/sessions/${sessionId}`}
        backHref="/trainer/calendar"
        showEnrollForm={false}
      />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/trainer/calendar"
          className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
        >
          Ouvrir le calendrier formateur
        </Link>
      </div>
    </div>
  );
}
