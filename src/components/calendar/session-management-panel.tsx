"use client";

import { Fragment, useState } from "react";

import { AttendanceStatus, SessionEnrollmentStatus } from "@prisma/client";

import {
  bulkApproveEnrollmentsAction,
  markSessionAttendanceAction,
  reviewSessionEnrollmentAction,
} from "@/actions/training";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  attendanceStatusLabels,
  getAttendanceStatusClassName,
} from "@/lib/training";

type EnrollmentItem = {
  id: string;
  status: SessionEnrollmentStatus;
  createdAt: Date;
  user: { id: string; name: string | null; email: string };
};

type AttendanceItem = {
  userId: string;
  status: AttendanceStatus;
};

type SessionManagementPanelProps = {
  sessionId: string;
  enrollments: EnrollmentItem[];
  attendances: AttendanceItem[];
  returnTo: string;
};

export function SessionManagementPanel({
  sessionId,
  enrollments,
  attendances,
  returnTo,
}: SessionManagementPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pending = enrollments.filter((e) => e.status === SessionEnrollmentStatus.PENDING);
  const approved = enrollments.filter((e) => e.status === SessionEnrollmentStatus.APPROVED);

  const allSelected = pending.length > 0 && pending.every((e) => selected.has(e.id));

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pending.map((e) => e.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1 : Demandes en attente                                     */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h4 className="font-semibold text-[#0c0910]">Demandes en attente</h4>
          <span className="rounded-full bg-[#ffc857]/25 px-2.5 py-0.5 text-xs font-bold text-[#b88c00]">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-[#0c0910]/55">Aucune demande en attente.</p>
        ) : (
          <>
            {/* Hidden forms for individual approve / reject — NOT nested inside the bulk form */}
            {pending.map((enrollment) => (
              <Fragment key={enrollment.id}>
                <form
                  id={`approve-${enrollment.id}`}
                  action={reviewSessionEnrollmentAction}
                  hidden
                >
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                  <input type="hidden" name="status" value={SessionEnrollmentStatus.APPROVED} />
                </form>
                <form
                  id={`reject-${enrollment.id}`}
                  action={reviewSessionEnrollmentAction}
                  hidden
                >
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="enrollmentId" value={enrollment.id} />
                  <input type="hidden" name="status" value={SessionEnrollmentStatus.REJECTED} />
                </form>
              </Fragment>
            ))}

            {/* Bulk approve form — wraps the table */}
            <form action={bulkApproveEnrollmentsAction}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {/* Dynamically inject selected IDs as hidden inputs */}
              {[...selected].map((id) => (
                <input key={id} type="hidden" name="enrollmentIds" value={id} />
              ))}

              <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f7f9ff]">
                    <tr>
                      <th className="w-10 p-3 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#0F63FF]"
                          aria-label="Tout sélectionner"
                        />
                      </th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                        Participant
                      </th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                        Email
                      </th>
                      <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb] bg-white">
                    {pending.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className={selected.has(enrollment.id) ? "bg-[#0F63FF]/5" : ""}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(enrollment.id)}
                            onChange={() => toggleOne(enrollment.id)}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#0F63FF]"
                          />
                        </td>
                        <td className="p-3 font-medium text-[#0c0910]">
                          {enrollment.user.name ?? "—"}
                        </td>
                        <td className="p-3 text-[#0c0910]/70">{enrollment.user.email}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            {/* These buttons submit the hidden forms above via the `form` attr */}
                            <button
                              type="submit"
                              form={`approve-${enrollment.id}`}
                              className="rounded-lg bg-[#119da4] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0e8a90]"
                            >
                              Approuver
                            </button>
                            <button
                              type="submit"
                              form={`reject-${enrollment.id}`}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#0c0910]/55">
                  {selected.size > 0
                    ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
                    : "Cochez des lignes pour approuver en lot."}
                </p>
                <SubmitButton
                  disabled={selected.size === 0}
                  className="primary-button px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  pendingLabel="Approbation en cours..."
                >
                  Approuver la sélection{selected.size > 0 ? ` (${selected.size})` : ""}
                </SubmitButton>
              </div>
            </form>
          </>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 : Liste de présence                                       */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h4 className="font-semibold text-[#0c0910]">Liste de présence</h4>
          <span className="rounded-full bg-[#0F63FF]/10 px-2.5 py-0.5 text-xs font-bold text-[#0F63FF]">
            {approved.length}
          </span>
        </div>

        {approved.length === 0 ? (
          <p className="text-sm text-[#0c0910]/55">Aucun apprenant approuvé sur cette session.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f7f9ff]">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                    Participant
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                    Présence actuelle
                  </th>
                  <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-[#0c0910]/60">
                    Pointer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] bg-white">
                {approved.map((enrollment) => {
                  const att = attendances.find((a) => a.userId === enrollment.user.id);
                  return (
                    <tr key={enrollment.id}>
                      <td className="p-3">
                        <p className="font-medium text-[#0c0910]">
                          {enrollment.user.name ?? "—"}
                        </p>
                        <p className="text-xs text-[#0c0910]/60">{enrollment.user.email}</p>
                      </td>
                      <td className="p-3">
                        {att ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAttendanceStatusClassName(att.status)}`}
                          >
                            {attendanceStatusLabels[att.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-[#0c0910]/40">Non pointé</span>
                        )}
                      </td>
                      <td className="p-3">
                        <form
                          action={markSessionAttendanceAction}
                          className="flex items-center justify-end gap-2"
                        >
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="sessionId" value={sessionId} />
                          <input type="hidden" name="userId" value={enrollment.user.id} />
                          <select
                            name="status"
                            defaultValue={att?.status ?? AttendanceStatus.PRESENT}
                            className="form-select h-9 text-sm"
                          >
                            {Object.values(AttendanceStatus).map((s) => (
                              <option key={s} value={s}>
                                {attendanceStatusLabels[s]}
                              </option>
                            ))}
                          </select>
                          <SubmitButton
                            className="rounded-lg bg-[#0F63FF] px-3 py-1.5 text-xs font-semibold !text-white transition hover:bg-[#0050d0]"
                            pendingLabel="..."
                          >
                            Pointer
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
