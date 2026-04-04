"use client";

import { QuizQuestionType } from "@prisma/client";
import { useState } from "react";

import { submitQuizAttemptAction } from "@/actions/quiz";

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

  return (
    <form action={submitQuizAttemptAction} className="space-y-5">
      <input type="hidden" name="quizId" value={quiz.id} />
      <input type="hidden" name="chapterId" value={chapterId} />
      <input type="hidden" name="courseSlug" value={courseSlug} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} readOnly />

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[#0c0910]">{quiz.title}</h3>
        <p className="text-sm text-[#0c0910]/65">
          Score minimum : {quiz.passingScore}% • Récompense prévue : {quiz.xpReward} XP
        </p>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((question) => {
          const selected = answers[question.id] ?? [];

          return (
            <article key={question.id} className="space-y-3 rounded-2xl border border-[#0c0910]/10 bg-[#f7f9ff] p-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#453750]">
                  Question {question.order} • {question.type === QuizQuestionType.SINGLE ? "Choix unique" : "Choix multiple"}
                </p>
                <p className="font-medium text-[#0c0910]">{question.questionText}</p>
              </div>

              <div className="space-y-2">
                {question.options.map((option) => {
                  const checked = selected.includes(option.id);

                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                        checked
                          ? "border-[#0F63FF]/30 bg-white text-[#0F63FF]"
                          : "border-[#0c0910]/10 bg-white text-[#0c0910]/80 hover:border-[#0F63FF]/20"
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

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-[#0F63FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0F63FF]/90"
      >
        {hasAttempt ? "Repasser le quiz" : "Valider le quiz"}
      </button>
    </form>
  );
}
