"use client";

import { QuizQuestionType } from "@prisma/client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { saveQuizBuilderAction, type QuizBuilderActionState } from "@/actions/quiz";
import { FormFeedback } from "@/components/feedback/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";

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

type QuizOptionDraft = {
  id: string;
  optionText: string;
  isCorrect: boolean;
};

type QuizQuestionDraft = {
  id: string;
  questionText: string;
  type: QuizQuestionType;
  options: QuizOptionDraft[];
};

const INITIAL_ACTION_STATE: QuizBuilderActionState = {
  status: "idle",
};

function createLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function createOptionDraft(overrides?: Partial<QuizOptionDraft>): QuizOptionDraft {
  return {
    id: createLocalId(),
    optionText: "",
    isCorrect: false,
    ...overrides,
  };
}

function createQuestionDraft(overrides?: Partial<QuizQuestionDraft>): QuizQuestionDraft {
  return {
    id: createLocalId(),
    questionText: "",
    type: QuizQuestionType.SINGLE,
    options: [createOptionDraft({ isCorrect: true }), createOptionDraft()],
    ...overrides,
  };
}

export function QuizManager({ courseId, chapterId, quiz }: QuizManagerProps) {
  const router = useRouter();
  const persistedQuizExists = Boolean(quiz);
  const [enabled, setEnabled] = useState(Boolean(quiz));
  const [title, setTitle] = useState(quiz?.title ?? "Quiz du chapitre");
  const [passingScore, setPassingScore] = useState(quiz?.passingScore ?? 70);
  const [xpReward, setXpReward] = useState(quiz?.xpReward ?? 50);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(
    quiz?.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      type: question.type,
      options: question.options.map((option) => ({
        id: option.id,
        optionText: option.optionText,
        isCorrect: option.isCorrect,
      })),
    })) ?? [],
  );

  const [state, formAction, isPending] = useActionState<QuizBuilderActionState, FormData>(
    saveQuizBuilderAction,
    INITIAL_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  const payload = useMemo(
    () =>
      JSON.stringify({
        enabled,
        title: title.trim(),
        passingScore,
        xpReward,
        questions: questions.map((question) => ({
          questionText: question.questionText.trim(),
          type: question.type,
          options: question.options.map((option) => ({
            optionText: option.optionText.trim(),
            isCorrect: option.isCorrect,
          })),
        })),
      }),
    [enabled, passingScore, questions, title, xpReward],
  );

  function updateQuestion(questionId: string, updater: (question: QuizQuestionDraft) => QuizQuestionDraft) {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? updater(question) : question)),
    );
  }

  function addQuestion() {
    setQuestions((current) => [...current, createQuestionDraft()]);
  }

  function removeQuestion(questionId: string) {
    if (!window.confirm("Supprimer cette question du quiz ?")) {
      return;
    }

    setQuestions((current) => current.filter((question) => question.id !== questionId));
  }

  function moveQuestion(questionId: string, direction: "up" | "down") {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === questionId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function addOption(questionId: string) {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: [...question.options, createOptionDraft()],
    }));
  }

  function removeOption(questionId: string, optionId: string) {
    if (!window.confirm("Supprimer cette réponse ?")) {
      return;
    }

    updateQuestion(questionId, (question) => {
      const nextOptions = question.options.filter((option) => option.id !== optionId);

      if (question.type === QuizQuestionType.SINGLE && nextOptions.length && !nextOptions.some((option) => option.isCorrect)) {
        nextOptions[0] = {
          ...nextOptions[0],
          isCorrect: true,
        };
      }

      return {
        ...question,
        options: nextOptions,
      };
    });
  }

  function updateOptionText(questionId: string, optionId: string, optionText: string) {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              optionText,
            }
          : option,
      ),
    }));
  }

  function updateCorrectAnswer(questionId: string, optionId: string, checked: boolean) {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: question.options.map((option) => {
        if (question.type === QuizQuestionType.SINGLE) {
          return {
            ...option,
            isCorrect: option.id === optionId ? true : false,
          };
        }

        return option.id === optionId
          ? {
              ...option,
              isCorrect: checked,
            }
          : option;
      }),
    }));
  }

  function updateQuestionType(questionId: string, type: QuizQuestionType) {
    updateQuestion(questionId, (question) => {
      if (type === question.type) {
        return question;
      }

      if (type === QuizQuestionType.SINGLE) {
        const firstCorrectIndex = question.options.findIndex((option) => option.isCorrect);
        const keepIndex = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;

        return {
          ...question,
          type,
          options: question.options.map((option, index) => ({
            ...option,
            isCorrect: index === keepIndex,
          })),
        };
      }

      return {
        ...question,
        type,
      };
    });
  }

  function enableQuizBuilder() {
    setEnabled(true);
    setQuestions((current) => (current.length ? current : [createQuestionDraft()]));
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[#0c0910]/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[#0c0910]">Quiz du chapitre</h3>
          <p className="text-sm text-[#0c0910]/65">
            Le quiz est optionnel. Quand il existe, sa réussite devient nécessaire pour terminer ce chapitre.
          </p>
        </div>

        {enabled ? (
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Retirer le quiz
          </button>
        ) : (
          <button
            type="button"
            onClick={enableQuizBuilder}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0F63FF]/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un quiz
          </button>
        )}
      </div>

      <FormFeedback type={state.status === "error" ? "error" : "success"} message={state.message} />

      {!enabled ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] p-5">
          <p className="text-sm text-[#0c0910]/70">
            Aucun quiz n’est attaché à ce chapitre pour le moment.
          </p>

          {persistedQuizExists ? (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="chapterId" value={chapterId} />
              <input type="hidden" name="payload" value={payload} readOnly />
              <p className="text-sm text-red-600">
                Le quiz existant sera supprimé lorsque vous enregistrerez cette modification.
              </p>
              <SubmitButton
                disabled={isPending}
                pendingLabel="Suppression..."
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Suppression..." : "Confirmer la suppression"}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="chapterId" value={chapterId} />
          <input type="hidden" name="payload" value={payload} readOnly />

          <div className="grid gap-3 rounded-2xl border border-[#0c0910]/10 bg-[#f7f9ff] p-4 md:grid-cols-[1fr_160px_160px]">
            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              Titre du quiz
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                placeholder="Quiz du chapitre"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              Score de réussite
              <input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(event) => setPassingScore(Number(event.target.value) || 0)}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[#0c0910]">
              Récompense XP
              <input
                type="number"
                min={1}
                value={xpReward}
                onChange={(event) => setXpReward(Number(event.target.value) || 0)}
                className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-[#0c0910]">Questions</h4>
                <p className="text-sm text-[#0c0910]/60">
                  Préparez toutes les questions ici, puis enregistrez une seule fois.
                </p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0F63FF]/90"
              >
                <Plus className="h-4 w-4" />
                Ajouter une question
              </button>
            </div>

            {questions.length ? (
              <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <article key={question.id} className="space-y-4 rounded-2xl border border-[#0c0910]/10 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="grid flex-1 gap-3 md:grid-cols-[1fr_220px]">
                        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                          Question {questionIndex + 1}
                          <textarea
                            value={question.questionText}
                            onChange={(event) =>
                              updateQuestion(question.id, (current) => ({
                                ...current,
                                questionText: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 py-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                            placeholder="Rédigez votre question..."
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-[#0c0910]">
                          Type de question
                          <select
                            value={question.type}
                            onChange={(event) =>
                              updateQuestionType(question.id, event.target.value as QuizQuestionType)
                            }
                            className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                          >
                            <option value={QuizQuestionType.SINGLE}>Choix unique</option>
                            <option value={QuizQuestionType.MULTIPLE}>Choix multiple</option>
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moveQuestion(question.id, "up")}
                          className="rounded-xl border border-[#0c0910]/10 bg-white p-2 text-[#0c0910] transition hover:bg-[#0F63FF]/5"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(question.id, "down")}
                          className="rounded-xl border border-[#0c0910]/10 bg-white p-2 text-[#0c0910] transition hover:bg-[#0F63FF]/5"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-xl border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl bg-[#f7f9ff] p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h5 className="font-semibold text-[#0c0910]">Réponses</h5>
                          <p className="text-xs text-[#0c0910]/60">
                            {question.type === QuizQuestionType.SINGLE
                              ? "Choisissez une seule bonne réponse."
                              : "Vous pouvez définir plusieurs bonnes réponses."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#0c0910]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0F63FF]/5"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter une réponse
                        </button>
                      </div>

                      <div className="space-y-3">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={option.id}
                            className="grid gap-3 rounded-2xl border border-[#0c0910]/10 bg-white p-3 md:grid-cols-[auto_1fr_auto]"
                          >
                            <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0c0910]/10 bg-[#f7f9ff] px-3 py-2 text-sm text-[#0c0910]">
                              <input
                                type={question.type === QuizQuestionType.SINGLE ? "radio" : "checkbox"}
                                name={`correct-${question.id}`}
                                checked={option.isCorrect}
                                onChange={(event) =>
                                  updateCorrectAnswer(question.id, option.id, event.target.checked)
                                }
                                className="h-4 w-4 accent-[#0F63FF]"
                              />
                              Correcte
                            </label>

                            <input
                              value={option.optionText}
                              onChange={(event) =>
                                updateOptionText(question.id, option.id, event.target.value)
                              }
                              className="h-11 w-full rounded-xl border border-[#0c0910]/15 bg-white px-3 text-sm text-[#0c0910] outline-none ring-[#0F63FF]/40 transition focus:ring-2"
                              placeholder={`Réponse ${optionIndex + 1}`}
                            />

                            <button
                              type="button"
                              onClick={() => removeOption(question.id, option.id)}
                              disabled={question.options.length <= 2}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0c0910]/20 bg-[#f7f9ff] px-4 py-6 text-sm text-[#0c0910]/65">
                Ajoutez au moins une question pour enregistrer ce quiz.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#0c0910]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#0c0910]/60">
              Les modifications ne seront envoyées qu’au clic sur « Enregistrer le quiz ».
            </p>
            <SubmitButton
              disabled={isPending}
              pendingLabel="Enregistrement..."
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0F63FF]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Enregistrement..." : "Enregistrer le quiz"}
            </SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
