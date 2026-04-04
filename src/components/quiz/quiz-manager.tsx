import { QuizQuestionType } from "@prisma/client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import {
  createQuizAction,
  createQuizOptionAction,
  createQuizQuestionAction,
  deleteQuizAction,
  deleteQuizOptionAction,
  deleteQuizQuestionAction,
  moveQuizQuestionAction,
  updateQuizAction,
  updateQuizOptionAction,
  updateQuizQuestionAction,
} from "@/actions/quiz";

type QuizManagerProps = {
  courseId: string;
  chapterId: string;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    xpReward: number;
    questions: Array<{
      id: string;
      questionText: string;
      type: QuizQuestionType;
      order: number;
      options: Array<{
        id: string;
        optionText: string;
        isCorrect: boolean;
      }>;
    }>;
  } | null;
};

export function QuizManager({ courseId, chapterId, quiz }: QuizManagerProps) {
  if (!quiz) {
    return (
      <section className="space-y-4 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#0c0910]">Quiz du chapitre</h3>
          <p className="text-sm text-[#0c0910]/65">
            Le quiz est optionnel. Si vous en ajoutez un, sa réussite deviendra nécessaire pour marquer le chapitre comme terminé.
          </p>
        </div>

        <form action={createQuizAction} className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto]">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="chapterId" value={chapterId} />
          <input
            name="title"
            required
            placeholder="Titre du quiz"
            className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
          <input
            name="passingScore"
            type="number"
            min="1"
            max="100"
            defaultValue={70}
            className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
          <input
            name="xpReward"
            type="number"
            min="1"
            defaultValue={50}
            className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Créer
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#0c0910]">Quiz du chapitre</h3>
          <p className="text-sm text-[#0c0910]/65">
            Ce quiz est lié à ce chapitre uniquement. Un seul quiz est autorisé par chapitre.
          </p>
        </div>

        <form action={deleteQuizAction}>
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="chapterId" value={chapterId} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer le quiz
          </button>
        </form>
      </div>

      <form action={updateQuizAction} className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto]">
        <input type="hidden" name="quizId" value={quiz.id} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input
          name="title"
          required
          defaultValue={quiz.title}
          className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
        />
        <input
          name="passingScore"
          type="number"
          min="1"
          max="100"
          defaultValue={quiz.passingScore}
          className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
        />
        <input
          name="xpReward"
          type="number"
          min="1"
          defaultValue={quiz.xpReward}
          className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
        >
          Enregistrer
        </button>
      </form>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-[#0c0910]">Questions</h4>
          <p className="text-sm text-[#0c0910]/60">Ajoutez des questions puis définissez les bonnes réponses.</p>
        </div>

        <form action={createQuizQuestionAction} className="grid gap-3 rounded-2xl border border-[#0c0910]/10 bg-[#f7f9ff] p-4 md:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="quizId" value={quiz.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="chapterId" value={chapterId} />
          <input
            name="questionText"
            required
            placeholder="Texte de la question"
            className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          />
          <select
            name="type"
            defaultValue={QuizQuestionType.SINGLE}
            className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
          >
            <option value={QuizQuestionType.SINGLE}>Choix unique</option>
            <option value={QuizQuestionType.MULTIPLE}>Choix multiple</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </button>
        </form>

        <div className="space-y-4">
          {quiz.questions.length ? (
            quiz.questions.map((question) => (
              <article key={question.id} className="space-y-4 rounded-2xl border border-[#0c0910]/10 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <form action={updateQuizQuestionAction} className="flex-1 space-y-3">
                    <input type="hidden" name="questionId" value={question.id} />
                    <input type="hidden" name="quizId" value={quiz.id} />
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="chapterId" value={chapterId} />
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                      <input
                        name="questionText"
                        required
                        defaultValue={question.questionText}
                        className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                      />
                      <select
                        name="type"
                        defaultValue={question.type}
                        className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                      >
                        <option value={QuizQuestionType.SINGLE}>Choix unique</option>
                        <option value={QuizQuestionType.MULTIPLE}>Choix multiple</option>
                      </select>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <form action={moveQuizQuestionAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="quizId" value={quiz.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="chapterId" value={chapterId} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className="rounded-xl border border-[#0c0910]/10 bg-white p-2 text-[#0c0910] hover:bg-[#0F63FF]/5">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={moveQuizQuestionAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="quizId" value={quiz.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="chapterId" value={chapterId} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className="rounded-xl border border-[#0c0910]/10 bg-white p-2 text-[#0c0910] hover:bg-[#0F63FF]/5">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={deleteQuizQuestionAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="quizId" value={quiz.id} />
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="chapterId" value={chapterId} />
                      <button type="submit" className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-[#f7f9ff] p-4">
                  <div className="space-y-1">
                    <h5 className="font-semibold text-[#0c0910]">Réponses</h5>
                    <p className="text-xs text-[#0c0910]/60">
                      {question.type === QuizQuestionType.SINGLE
                        ? "Une seule réponse correcte doit être cochée."
                        : "Plusieurs réponses correctes peuvent être cochées."}
                    </p>
                  </div>

                  <form action={createQuizOptionAction} className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input type="hidden" name="questionId" value={question.id} />
                    <input type="hidden" name="quizId" value={quiz.id} />
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="chapterId" value={chapterId} />
                    <input
                      name="optionText"
                      required
                      placeholder="Texte de la réponse"
                      className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                    />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-[#0c0910]/10 bg-white px-3 py-2 text-sm text-[#0c0910]">
                      <input name="isCorrect" type="checkbox" className="h-4 w-4 accent-[#0F63FF]" />
                      Correcte
                    </label>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter
                    </button>
                  </form>

                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <form
                        key={option.id}
                        action={updateQuizOptionAction}
                        className="grid gap-3 rounded-2xl border border-[#0c0910]/10 bg-white p-3 md:grid-cols-[1fr_auto_auto_auto]"
                      >
                        <input type="hidden" name="optionId" value={option.id} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="quizId" value={quiz.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="chapterId" value={chapterId} />
                        <input
                          name="optionText"
                          required
                          defaultValue={option.optionText}
                          className="h-11 rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                        />
                        <label className="inline-flex items-center gap-2 rounded-xl border border-[#0c0910]/10 bg-[#f7f9ff] px-3 py-2 text-sm text-[#0c0910]">
                          <input
                            name="isCorrect"
                            type="checkbox"
                            defaultChecked={option.isCorrect}
                            className="h-4 w-4 accent-[#0F63FF]"
                          />
                          Correcte
                        </label>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-xl border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
                        >
                          Enregistrer
                        </button>
                        <button
                          formAction={deleteQuizOptionAction}
                          type="submit"
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-6 text-sm text-[#0c0910]/65">
              Ajoutez au moins une question pour rendre le quiz disponible côté apprenant.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
