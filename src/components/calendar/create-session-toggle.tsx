"use client";

import { useState } from "react";

import { SessionAccessPolicy, SessionStatus } from "@prisma/client";

import { createTrainingSessionAction } from "@/actions/training";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
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
          <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">Nouvelle session</h3>
          <p className="text-sm text-[var(--color-text-dark)]/60">
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
          <div className="md:col-span-2">
            <FormField label="Titre" htmlFor="session-title" required>
              <Input id="session-title" name="title" required className="text-sm" placeholder="Atelier IA du mardi" />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Description" htmlFor="session-description">
              <Textarea id="session-description" name="description" rows={3} className="text-sm" placeholder="Décrivez le contenu de la session..." />
            </FormField>
          </div>
          <FormField label="Début" htmlFor="session-startsAt" required>
            <Input id="session-startsAt" name="startsAt" type="datetime-local" required className="text-sm" />
          </FormField>
          <FormField label="Fin" htmlFor="session-endsAt" required>
            <Input id="session-endsAt" name="endsAt" type="datetime-local" required className="text-sm" />
          </FormField>
          <FormField label="Statut" htmlFor="session-status">
            <Select id="session-status" name="status" defaultValue={SessionStatus.SCHEDULED} className="text-sm">
              {Object.values(SessionStatus).map((s) => (
                <option key={s} value={s}>
                  {sessionStatusLabels[s]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Politique d'accès" htmlFor="session-accessPolicy">
            <Select id="session-accessPolicy" name="accessPolicy" defaultValue={SessionAccessPolicy.OPEN} className="text-sm">
              {Object.values(SessionAccessPolicy).map((p) => (
                <option key={p} value={p}>
                  {sessionAccessPolicyLabels[p]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="XP de présence" htmlFor="session-xpReward">
            <Input id="session-xpReward" name="xpReward" type="number" min="0" defaultValue={30} className="text-sm" />
          </FormField>
          <FormField label="Rappel (minutes)" htmlFor="session-reminderMinutes">
            <Input id="session-reminderMinutes" name="reminderMinutes" type="number" min="0" defaultValue={1440} className="text-sm" />
          </FormField>
          <FormField label="Journée entière" htmlFor="session-isAllDay">
            <Select id="session-isAllDay" name="isAllDay" defaultValue="false" className="text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </Select>
          </FormField>
          <FormField label="Lieu" htmlFor="session-location">
            <Input id="session-location" name="location" className="text-sm" placeholder="Antananarivo / Salle A / Distanciel" />
          </FormField>
          <FormField label="Lien visio" htmlFor="session-meetingUrl">
            <Input id="session-meetingUrl" name="meetingUrl" type="url" className="text-sm" placeholder="https://meet.google.com/..." />
          </FormField>
          <FormField
            label="Cours lié"
            htmlFor="session-courseId"
            helperText="Renseignez ce champ uniquement si la session cible un cours."
          >
            <Select id="session-courseId" name="courseId" className="text-sm">
              <option value="">Aucun cours lié</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Parcours lié"
            htmlFor="session-programId"
            helperText="Renseignez ce champ uniquement si la session cible un parcours."
          >
            <Select id="session-programId" name="programId" className="text-sm">
              <option value="">Aucun parcours lié</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField
              label="Récurrence (RRULE optionnelle)"
              htmlFor="session-recurrenceRule"
              helperText="Si renseigné, une session est créée par occurrence (plafonné à 52). Ex. FREQ=WEEKLY;BYDAY=MO;COUNT=10."
            >
              <Input id="session-recurrenceRule" name="recurrenceRule" className="text-sm" placeholder="FREQ=WEEKLY;COUNT=6" />
            </FormField>
          </div>
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
