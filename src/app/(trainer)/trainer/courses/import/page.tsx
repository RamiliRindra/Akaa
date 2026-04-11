import Link from "next/link";
import { redirect } from "next/navigation";

import { importCourseArchiveAction } from "@/actions/courses";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCachedSession } from "@/lib/auth-session";

type ImportCoursePageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function ImportCoursePage({ searchParams }: ImportCoursePageProps) {
  const [feedback, session] = await Promise.all([searchParams, getCachedSession()]);

  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href="/trainer/courses" className="text-sm font-medium text-[var(--color-primary-bright)] hover:underline">
          ← Retour à mes cours
        </Link>
        <h2 className="text-2xl font-bold text-[var(--color-text-dark)]">Importer un cours</h2>
        <p className="text-sm text-[var(--color-text-dark)]/70">
          Importez un cours complet avec ses modules et ses chapitres depuis une archive ZIP unique.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form action={importCourseArchiveAction} encType="multipart/form-data" className="space-y-5 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Archive d’import</h3>
            <p className="text-sm text-[var(--color-text-dark)]/60">
              L’archive doit contenir un fichier <code>manifest.csv</code> à la racine et un dossier{" "}
              <code>chapters/</code> avec les fichiers Markdown. Vous pouvez aussi ajouter des quiz optionnels via un dossier <code>quizzes/</code>.
            </p>
          </div>

          <label className="space-y-2 text-sm font-medium text-[var(--color-text-dark)]">
            Fichier ZIP
            <input
              name="archive"
              type="file"
              accept=".zip,application/zip"
              required
              className="block w-full rounded-xl border border-[var(--color-text-dark)]/15 bg-white px-3 py-3 text-sm text-[var(--color-text-dark)] transition file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-primary-bright)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--color-primary-bright)]/90"
            />
          </label>

          <SubmitButton
            className="primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
            pendingLabel="Import en cours..."
          >
            Valider et importer
          </SubmitButton>
        </form>

        <div className="space-y-4 rounded-2xl border border-[var(--color-text-dark)]/10 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Modèles à télécharger</h3>
            <p className="text-sm text-[var(--color-text-dark)]/60">
              Utilisez ces modèles pour préparer un import conforme au format attendu.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="/import-templates/manifest.template.csv"
              download
              className="secondary-button px-4 py-2 text-sm font-semibold"
            >
              Télécharger le modèle CSV
            </a>
            <a
              href="/import-templates/chapter.template.md"
              download
              className="secondary-button px-4 py-2 text-sm font-semibold"
            >
              Télécharger le modèle Markdown
            </a>
            <a
              href="/import-templates/quiz.template.json"
              download
              className="secondary-button px-4 py-2 text-sm font-semibold"
            >
              Télécharger le modèle Quiz JSON
            </a>
          </div>

          <div className="space-y-2 rounded-2xl bg-[var(--color-surface-high)] p-4 text-sm text-[var(--color-text-dark)]/75">
            <p className="font-semibold text-[var(--color-text-dark)]">Syntaxe Markdown supportée v1</p>
            <p>Titres, paragraphes, listes, citations, liens, séparateurs, code inline et blocs de code.</p>
            <p className="pt-2 font-semibold text-[var(--color-text-dark)]">Vidéos autorisées</p>
            <p>YouTube et Google Drive uniquement.</p>
            <p className="pt-2 font-semibold text-[var(--color-text-dark)]">Quiz optionnels</p>
            <p>Référencez un fichier JSON de quiz dans la colonne <code>quiz_file</code> du manifest si un chapitre doit inclure une évaluation.</p>
            <p className="pt-2 font-semibold text-[var(--color-text-dark)]">Niveau du cours</p>
            <p>Renseignez la colonne <code>course_level</code> avec <code>BEGINNER</code>, <code>INTERMEDIATE</code> ou <code>ADVANCED</code>.</p>
            <p className="pt-2 font-semibold text-[var(--color-text-dark)]">Règle d’import</p>
            <p>Une archive = un cours complet.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
