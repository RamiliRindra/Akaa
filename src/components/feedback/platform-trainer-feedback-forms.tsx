"use client";

import { useState } from "react";

import { submitTrainerAuthoringFeedbackAction, submitTrainerPlatformFeedbackAction } from "@/actions/feedback";
import { SubmitButton } from "@/components/ui/submit-button";

import { Rating } from "./star-rating";

type CourseOption = { id: string; title: string };

type AuthoringInitial = { rating: number; comment: string | null };

type PlatformTrainerFeedbackFormsProps = {
  courses: CourseOption[];
  /** Valeurs déjà enregistrées par cours (clé = courseId) */
  authoringInitialByCourseId: Record<string, AuthoringInitial>;
  platformInitialRating: number | null;
  platformInitialComment: string | null;
};

export function PlatformTrainerFeedbackForms({
  courses,
  authoringInitialByCourseId,
  platformInitialRating,
  platformInitialComment,
}: PlatformTrainerFeedbackFormsProps) {
  const [platformRating, setPlatformRating] = useState(platformInitialRating ?? 0);
  const firstCourseId = courses[0]?.id ?? "";
  const [authoringCourseId, setAuthoringCourseId] = useState(firstCourseId);
  const [authoringRating, setAuthoringRating] = useState(
    () => authoringInitialByCourseId[firstCourseId]?.rating ?? 0,
  );

  function handleCourseChange(nextId: string) {
    setAuthoringCourseId(nextId);
    setAuthoringRating(authoringInitialByCourseId[nextId]?.rating ?? 0);
  }

  return (
    <div className="space-y-8">
      <div className="surface-section space-y-5 p-6 sm:p-8">
        <div>
          <p className="editorial-eyebrow">Outil formateur</p>
          <h2 className="font-display text-2xl font-black text-[var(--color-text)]">Votre avis sur l’interface formateur</h2>
          <p className="mt-1 text-sm text-[var(--color-text)]/70">
            Création de cours, calendrier, parcours : une note globale et un commentaire libre.
          </p>
        </div>

        <form action={submitTrainerPlatformFeedbackAction} className="space-y-4">
          <input type="hidden" name="rating" value={platformRating > 0 ? String(platformRating) : ""} />

          <div className="space-y-2">
            <span className="text-sm font-medium text-[var(--color-text)]">Votre note</span>
            <Rating
              rating={platformRating > 0 ? platformRating : 0}
              maxRating={5}
              editable
              showValue={platformRating > 0}
              onRatingChange={(v) => setPlatformRating(v)}
              size="lg"
              label="Votre note pour l’outil formateur"
            />
            {platformRating === 0 ? (
              <p className="text-xs text-[#ef4444]">Sélectionnez au moins une étoile.</p>
            ) : null}
          </div>

          <label className="block space-y-2 text-sm font-medium text-[var(--color-text)]">
            Commentaire (optionnel)
            <textarea
              name="comment"
              rows={4}
              defaultValue={platformInitialComment ?? ""}
              maxLength={2000}
              className="form-textarea w-full text-sm"
              placeholder="Ce qui vous aide au quotidien, les frictions, les idées…"
            />
          </label>

          <SubmitButton
            className="cta-button px-5 py-3 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
            pendingLabel="Envoi..."
            disabled={platformRating < 1}
          >
            Enregistrer mon avis
          </SubmitButton>
        </form>
      </div>

      {courses.length > 0 ? (
        <div className="surface-section space-y-5 p-6 sm:p-8">
          <div>
            <p className="editorial-eyebrow">Création de contenu</p>
            <h2 className="font-display text-2xl font-black text-[var(--color-text)]">Avis sur un cours que vous pilotez</h2>
            <p className="mt-1 text-sm text-[var(--color-text)]/70">
              Une note et un commentaire par cours (éditeur, structure, médias). Vous pouvez les modifier plus tard.
            </p>
          </div>

          <form action={submitTrainerAuthoringFeedbackAction} className="space-y-4">
            <input type="hidden" name="courseId" value={authoringCourseId} />
            <input type="hidden" name="rating" value={authoringRating > 0 ? String(authoringRating) : ""} />

            <label className="block space-y-2 text-sm font-medium text-[var(--color-text)]">
              Cours
              <select
                value={authoringCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="form-textarea w-full py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-[var(--color-text)]">Votre note pour ce cours</span>
              <Rating
                key={authoringCourseId}
                rating={authoringRating > 0 ? authoringRating : 0}
                maxRating={5}
                editable
                showValue={authoringRating > 0}
                onRatingChange={(v) => setAuthoringRating(v)}
                size="lg"
                label="Note pour la création de ce cours"
              />
              {authoringRating === 0 ? (
                <p className="text-xs text-[#ef4444]">Sélectionnez au moins une étoile.</p>
              ) : null}
            </div>

            <label className="block space-y-2 text-sm font-medium text-[var(--color-text)]" key={authoringCourseId}>
              Commentaire (optionnel)
              <textarea
                name="comment"
                rows={4}
                defaultValue={authoringInitialByCourseId[authoringCourseId]?.comment ?? ""}
                maxLength={2000}
                className="form-textarea w-full text-sm"
                placeholder="Rédaction, modules, quiz, intégration vidéo…"
              />
            </label>

            <SubmitButton
              className="cta-button px-5 py-3 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
              pendingLabel="Envoi..."
              disabled={authoringRating < 1}
            >
              Enregistrer mon avis sur ce cours
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
