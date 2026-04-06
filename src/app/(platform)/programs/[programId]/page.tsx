import { notFound } from "next/navigation";

import { ProgramDetailPanel } from "@/components/program/program-detail-panel";
import { getCachedSession } from "@/lib/auth-session";
import { getTrainingProgramDetailForViewer } from "@/lib/session-access";

type PlatformProgramDetailPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function PlatformProgramDetailPage({ params }: PlatformProgramDetailPageProps) {
  const { programId } = await params;
  const session = await getCachedSession();

  if (!session?.user?.id) {
    notFound();
  }

  const program = await getTrainingProgramDetailForViewer(programId, session.user.id, session.user.role);

  if (!program) {
    notFound();
  }

  return (
    <ProgramDetailPanel
      program={program}
      backHref="/programs"
      sessionDetailHref={(id) => `/calendar/sessions/${id}`}
    />
  );
}
