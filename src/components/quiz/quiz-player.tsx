"use client";

import { QuizQuestionType } from "@prisma/client";
import { useState } from "react";

import { submitQuizAttemptAction } from "@/actions/quiz";
import { SubmitButton } from "@/components/ui/submit-button";

type QuizPlayerProps = {
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
      }>;
    }>;
  };
  chapterId: string;
  courseSlug: string;
  hasAttempt: boolean;
};

function toggleOption(
  current: Record<string, string[]>,
  questionId: string,
  optionId: string,
  type: QuizQuestionType,
) {
  const existing = current[questionId] ?? [];

  if (type === QuizQuestionType.SINGLE) {
    return {
      ...current,
      [questionId]: [optionId],
    };
  }

  const next = existing.includes(optionId)
    ? existing.filter((value) => value !== optionId)
    : [...existing, optionId];

  return {
    ...current,
    [questionId]: next,
  };
}

export function QuizPlayer({ quiz, chapterId, courseSlug, hasAttempt }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const answeredQuestions = Object.values(answers).filter((selected) => selected.length > 0).length;

  return (
    <form action={submitQuizAttemptAction} className="space-y-5">
      <input type="hidden" name="quizId" value={quiz.id} />
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="courseSlug" value={courseSlug} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} readOnly />

      <div className="surface-section p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-primary">
              {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}
            </span>
            <span className="chip chip-secondary">{answeredQuestions}/{quiz.questions.length} répondues</span>
            <span className="chip chip-accent">{quiz.xpReward} XP</span>
          </div>
          <div>
            <h3 className="font-display text-2xl font-black text-[#2c2f31]">{quiz.title}</h3>
            <p className="mt-2 text-sm text-[#2c2f31]/65">
              Score minimum : {quiz.passingScore}% • Récompense prévue : {quiz.xpReward} XP
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((question) => {
          const selected = answers[question.id] ?? [];

          return (
            <article key={question.id} className="panel-card space-y-4 p-5 sm:p-6">
              <div className="space-y-1">
                <p className="editorial-eyebrow">
                  Question {question.order} • {question.type === QuizQuestionType.SINGLE ? "Choix unique" : "Choix multiple"}
                </p>
                <p className="text-base font-semibold text-[#2c2f31] sm:text-lg">{question.questionText}</p>
              </div>

              <div className="space-y-2">
                {question.options.map((option) => {
                  const checked = selected.includes(option.id);

                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-[1.2rem] px-4 py-4 text-sm transition ${
                        checked
                          ? "bg-[linear-gradient(135deg,rgba(0,80,214,0.12),rgba(15,99,255,0.06))] text-[#0050d6] ring-1 ring-[#0050d6]/14"
                          : "bg-[var(--color-surface-high)] text-[#2c2f31]/80 ring-1 ring-[#2c2f31]/8 hover:bg-white hover:ring-[#0F63FF]/14"
                      }`}
                    >
                      <input
                        type={question.type === QuizQuestionType.SINGLE ? "radio" : "checkbox"}
                        name={`question-${question.id}`}
                        checked={checked}
                        onChange={() =>
                          setAnswers((current) => toggleOption(current, question.id, option.id, question.type))
                        }
                        className="mt-1 h-4 w-4 accent-[#0F63FF]"
                      />
                      <span>{option.optionText}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <SubmitButton
        className="primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
        pendingLabel="Validation..."
      >
        {hasAttempt ? "Repasser le quiz" : "Valider le quiz"}
      </SubmitButton>
    </form>
  );
}
