import { SessionStatus, UserRole } from "@prisma/client";
import { notFound } from "next/navigation";

import { SessionDetailPanel } from "@/components/calendar/session-detail-panel";
import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getTrainingSessionForViewer } from "@/lib/session-access";

type PlatformSessionDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PlatformSessionDetailPage({ params }: PlatformSessionDetailPageProps) {
  const { sessionId } = await params;
  const session = await getCachedSession();

  if (!session?.user?.id) {
    notFound();
  }

  const trainingSession = await getTrainingSessionForViewer(sessionId, session.user.id, session.user.role);

  if (!trainingSession) {
    notFound();
  }

  const enrollment =
    session.user.role === UserRole.LEARNER
      ? await db.sessionEnrollment.findFirst({
          where: { sessionId, userId: session.user.id },
          select: { id: true, status: true },
        })
      : null;

  const now = new Date();
  const showEnrollForm =
    session.user.role === UserRole.LEARNER &&
    !enrollment &&
    trainingSession.status === SessionStatus.SCHEDULED &&
    trainingSession.endsAt > now;

  return (
    <SessionDetailPanel
      session={trainingSession}
      enrollment={enrollment}
      returnTo={`/calendar/sessions/${sessionId}`}
      backHref="/calendar"
      showEnrollForm={showEnrollForm}
    />
  );
}
