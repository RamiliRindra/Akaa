import Link from "next/link";
import { redirect } from "next/navigation";

import { importCourseArchiveAction } from "@/actions/courses";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { auth } from "@/lib/auth";

type ImportCoursePageProps = {
  searchParams: Promise<{
    type?: string;
    message?: string;
  }>;
};

export default async function ImportCoursePage({ searchParams }: ImportCoursePageProps) {
  const [feedback, session] = await Promise.all([searchParams, auth()]);

  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href="/trainer/courses" className="text-sm font-medium text-[#0F63FF] hover:underline">
          ← Retour à mes cours
        </Link>
        <h2 className="text-2xl font-bold text-[#0c0910]">Importer un cours</h2>
        <p className="text-sm text-[#0c0910]/70">
          Importez un cours complet avec ses modules et ses chapitres depuis une archive ZIP unique.
        </p>
      </div>

      <FormFeedback type={feedback.type} message={feedback.message} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form action={importCourseArchiveAction} encType="multipart/form-data" className="space-y-5 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#0c0910]">Archive d’import</h3>
            <p className="text-sm text-[#0c0910]/60">
              L’archive doit contenir un fichier <code>manifest.csv</code> à la racine et un dossier{" "}
              <code>chapters/</code> avec les fichiers Markdown. Vous pouvez aussi ajouter des quiz optionnels via un dossier <code>quizzes/</code>.
            </p>
          </div>

          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Fichier ZIP
            <input
              name="archive"
              type="file"
              accept=".zip,application/zip"
              required
              className="block w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 py-3 text-sm text-[#0c0910] file:mr-4 file:rounded-lg file:border-0 file:bg-[#0F63FF] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0F63FF]/90"
            />
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
          >
            Valider et importer
          </button>
        </form>

        <div className="space-y-4 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#0c0910]">Modèles à télécharger</h3>
            <p className="text-sm text-[#0c0910]/60">
              Utilisez ces modèles pour préparer un import conforme au format attendu.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="/import-templates/manifest.template.csv"
              download
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              Télécharger le modèle CSV
            </a>
            <a
              href="/import-templates/chapter.template.md"
              download
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              Télécharger le modèle Markdown
            </a>
            <a
              href="/import-templates/quiz.template.json"
              download
              className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
            >
              Télécharger le modèle Quiz JSON
            </a>
          </div>

          <div className="space-y-2 rounded-2xl bg-[#f7f9ff] p-4 text-sm text-[#0c0910]/75">
            <p className="font-semibold text-[#0c0910]">Syntaxe Markdown supportée v1</p>
            <p>Titres, paragraphes, listes, citations, liens, séparateurs, code inline et blocs de code.</p>
            <p className="pt-2 font-semibold text-[#0c0910]">Vidéos autorisées</p>
            <p>YouTube et Google Drive uniquement.</p>
            <p className="pt-2 font-semibold text-[#0c0910]">Quiz optionnels</p>
            <p>Référencez un fichier JSON de quiz dans la colonne <code>quiz_file</code> du manifest si un chapitre doit inclure une évaluation.</p>
            <p className="pt-2 font-semibold text-[#0c0910]">Règle d’import</p>
            <p>Une archive = un cours complet.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
