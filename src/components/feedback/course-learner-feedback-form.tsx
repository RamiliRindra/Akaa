"use client";

import { useState } from "react";

import { submitLearnerCourseFeedbackAction } from "@/actions/feedback";
import { SubmitButton } from "@/components/ui/submit-button";

import { Rating } from "./star-rating";

type CourseLearnerFeedbackFormProps = {
  courseId: string;
  courseSlug: string;
  initialRating: number | null;
  initialComment: string | null;
  aggregateRating: number | null;
  reviewCount: number;
};

export function CourseLearnerFeedbackForm({
  courseId,
  courseSlug,
  initialRating,
  initialComment,
  aggregateRating,
  reviewCount,
}: CourseLearnerFeedbackFormProps) {
  const [rating, setRating] = useState(initialRating ?? 0);

  return (
    <div className="surface-section space-y-5 p-6 sm:p-8">
      <div>
        <p className="editorial-eyebrow">Votre avis</p>
        <h2 className="font-display text-2xl font-black text-[#2c2f31]">Noter ce cours</h2>
        <p className="mt-1 text-sm text-[#2c2f31]/70">
          Note de 1 à 5 étoiles, commentaire facultatif. Vous pouvez modifier votre avis à tout moment.
        </p>
      </div>

      {reviewCount > 0 && aggregateRating !== null ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#fff8e7] px-4 py-3">
          <span className="text-sm font-medium text-[#775600]">Moyenne des apprenants</span>
          <Rating rating={aggregateRating} maxRating={5} showValue size="default" label="Moyenne" />
          <span className="text-sm text-[#775600]/80">({reviewCount} avis)</span>
        </div>
      ) : (
        <p className="text-sm text-[#2c2f31]/60">Soyez le premier à laisser une note sur ce cours.</p>
      )}

      <form action={submitLearnerCourseFeedbackAction} className="space-y-4">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="courseSlug" value={courseSlug} />
        <input type="hidden" name="rating" value={rating > 0 ? String(rating) : ""} />

        <div className="space-y-2">
          <span className="text-sm font-medium text-[#2c2f31]">Votre note</span>
          <Rating
            rating={rating > 0 ? rating : 0}
            maxRating={5}
            editable
            showValue={rating > 0}
            onRatingChange={(v) => setRating(v)}
            size="lg"
            label="Votre note pour ce cours"
          />
          {rating === 0 ? <p className="text-xs text-[#ef4444]">Sélectionnez au moins une étoile.</p> : null}
        </div>

        <label className="block space-y-2 text-sm font-medium text-[#2c2f31]">
          Commentaire (optionnel)
          <textarea
            name="comment"
            rows={4}
            defaultValue={initialComment ?? ""}
            maxLength={2000}
            className="form-textarea w-full text-sm"
            placeholder="Qu’avez-vous pensé du contenu, du rythme, de la clarté ?"
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
