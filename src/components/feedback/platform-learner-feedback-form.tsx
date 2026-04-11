"use client";

import { useState } from "react";

import { submitLearnerPlatformFeedbackAction } from "@/actions/feedback";
import { SubmitButton } from "@/components/ui/submit-button";

import { Rating } from "./star-rating";

type PlatformLearnerFeedbackFormProps = {
  initialRating: number | null;
  initialComment: string | null;
};

export function PlatformLearnerFeedbackForm({
  initialRating,
  initialComment,
}: PlatformLearnerFeedbackFormProps) {
  const [rating, setRating] = useState(initialRating ?? 0);

  return (
    <div className="surface-section space-y-5 p-6 sm:p-8">
      <div>
        <p className="editorial-eyebrow">Plateforme</p>
        <h2 className="font-display text-2xl font-black text-[var(--color-text)]">Votre avis sur Akaa</h2>
        <p className="mt-1 text-sm text-[var(--color-text)]/70">
          Note globale de 1 à 5 étoiles, commentaire facultatif. Vous pouvez mettre à jour votre avis quand vous voulez.
        </p>
      </div>

      <form action={submitLearnerPlatformFeedbackAction} className="space-y-4">
        <input type="hidden" name="rating" value={rating > 0 ? String(rating) : ""} />

        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Votre note</span>
          <Rating
            rating={rating > 0 ? rating : 0}
            maxRating={5}
            editable
            showValue={rating > 0}
            onRatingChange={(v) => setRating(v)}
            size="lg"
            label="Votre note pour la plateforme"
          />
          {rating === 0 ? <p className="text-xs text-[#ef4444]">Sélectionnez au moins une étoile.</p> : null}
        </div>

        <label className="block space-y-2 text-sm font-medium text-[var(--color-text)]">
          Commentaire (optionnel)
          <textarea
            name="comment"
            rows={4}
            defaultValue={initialComment ?? ""}
            maxLength={2000}
            className="form-textarea w-full text-sm"
            placeholder="Navigation, contenus, gamification, ce qui pourrait être amélioré…"
          />
        </label>

        <SubmitButton
          className="cta-button px-5 py-3 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
          pendingLabel="Envoi..."
          disabled={rating < 1}
        >
          Enregistrer mon avis
        </SubmitButton>
      </form>
    </div>
  );
}
