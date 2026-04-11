import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { SessionManagementPanel } from "@/components/calendar/session-management-panel";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
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

  const [trainingSession, enrollments, attendances] = await Promise.all([
    getTrainingSessionForStaff(sessionId),
    db.sessionEnrollment.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.sessionAttendance.findMany({
      where: { sessionId },
      select: { userId: true, status: true },
    }),
  ]);

  if (!trainingSession) {
    notFound();
  }

  const returnTo = `/trainer/sessions/${sessionId}`;

  return (
    <div className="space-y-8">
      <SessionDetailPanel
        session={trainingSession}
        enrollment={null}
        returnTo={returnTo}
        backHref="/trainer/calendar"
        showEnrollForm={false}
      />

      <div className="panel-card p-6">
        <div className="mb-6 space-y-1">
          <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Gestion des participants</h3>
          <p className="text-sm text-[var(--color-text-dark)]/60">
            Approuvez les demandes d&apos;inscription et pointez la présence des apprenants.
          </p>
        </div>
        <SessionManagementPanel
          sessionId={sessionId}
          enrollments={enrollments}
          attendances={attendances}
          returnTo={returnTo}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/trainer/calendar"
          className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
        >
          Retour au calendrier
        </Link>
      </div>
    </div>
  );
}
