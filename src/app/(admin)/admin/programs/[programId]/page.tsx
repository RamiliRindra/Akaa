import { notFound } from "next/navigation";

import { ProgramDetailPanel } from "@/components/program/program-detail-panel";
import { getCachedSession } from "@/lib/auth-session";
import { getTrainingProgramDetailForViewer } from "@/lib/session-access";

type AdminProgramDetailPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function AdminProgramDetailPage({ params }: AdminProgramDetailPageProps) {
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
      backHref="/admin/programs"
      sessionDetailHref={(id) => `/admin/sessions/${id}`}
    />
  );
}
