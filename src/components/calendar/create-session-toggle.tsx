"use client";

import { useState } from "react";

import { SessionAccessPolicy, SessionStatus } from "@prisma/client";

import { createTrainingSessionAction } from "@/actions/training";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  sessionAccessPolicyLabels,
  sessionStatusLabels,
} from "@/lib/training";

type CourseOption = { id: string; title: string };
type ProgramOption = { id: string; title: string };

type CreateSessionToggleProps = {
  courses: CourseOption[];
  programs: ProgramOption[];
};

export function CreateSessionToggle({ courses, programs }: CreateSessionToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[#0c0910]">Nouvelle session</h3>
          <p className="text-sm text-[#0c0910]/60">
            Planifiez une session synchrone liée à un cours ou un parcours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            open
              ? "secondary-button inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold"
              : "primary-button inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold"
          }
        >
          {open ? "Annuler" : "+ Créer une session"}
        </button>
      </div>

      {open && (
        <form
          action={createTrainingSessionAction}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="returnTo" value="/trainer/calendar" />
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Titre
            <input
              name="title"
              required
              className="form-input text-sm"
              placeholder="Atelier IA du mardi"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Description
            <textarea
              name="description"
              rows={3}
              className="form-textarea text-sm"
              placeholder="Décrivez le contenu de la session..."
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Début
            <input name="startsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Fin
            <input name="endsAt" type="datetime-local" required className="form-input text-sm" />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Statut
            <select
              name="status"
              defaultValue={SessionStatus.SCHEDULED}
              className="form-select text-sm"
            >
              {Object.values(SessionStatus).map((s) => (
                <option key={s} value={s}>
                  {sessionStatusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Politique d&apos;accès
            <select
              name="accessPolicy"
              defaultValue={SessionAccessPolicy.OPEN}
              className="form-select text-sm"
            >
              {Object.values(SessionAccessPolicy).map((p) => (
                <option key={p} value={p}>
                  {sessionAccessPolicyLabels[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            XP de présence
            <input
              name="xpReward"
              type="number"
              min="0"
              defaultValue={30}
              className="form-input text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Rappel (minutes)
            <input
              name="reminderMinutes"
              type="number"
              min="0"
              defaultValue={1440}
              className="form-input text-sm"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Journée entière
            <select name="isAllDay" defaultValue="false" className="form-select text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lieu
            <input
              name="location"
              className="form-input text-sm"
              placeholder="Antananarivo / Salle A / Distanciel"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Lien visio
            <input
              name="meetingUrl"
              type="url"
              className="form-input text-sm"
              placeholder="https://meet.google.com/..."
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Cours lié
            <select name="courseId" className="form-select text-sm">
              <option value="">Aucun cours lié</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <p className="text-xs font-normal text-[#0c0910]/55">
              Renseignez ce champ uniquement si la session cible un cours.
            </p>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910]">
            Parcours lié
            <select name="programId" className="form-select text-sm">
              <option value="">Aucun parcours lié</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <p className="text-xs font-normal text-[#0c0910]/55">
              Renseignez ce champ uniquement si la session cible un parcours.
            </p>
          </label>
          <label className="space-y-2 text-sm font-medium text-[#0c0910] md:col-span-2">
            Récurrence (RRULE optionnelle)
            <input
              name="recurrenceRule"
              className="form-input text-sm"
              placeholder="FREQ=WEEKLY;COUNT=6"
            />
            <span className="block text-xs font-normal text-[#0c0910]/55">
              Si renseigné, une session est créée par occurrence (plafonné à 52). Ex.
              FREQ=WEEKLY;BYDAY=MO;COUNT=10.
            </span>
          </label>
          <div className="md:col-span-2">
            <SubmitButton
              className="primary-button px-5 py-3 text-sm font-semibold"
              pendingLabel="Création..."
            >
              Créer la session
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
