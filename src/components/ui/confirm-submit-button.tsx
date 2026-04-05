"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";

type ConfirmSubmitButtonProps = {
  triggerLabel?: string;
  triggerChildren?: React.ReactNode;
  triggerClassName: string;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmClassName?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  requireText?: string;
  requireTextLabel?: string;
  requireTextPlaceholder?: string;
  showSpinner?: boolean;
  ariaLabel?: string;
};

export function ConfirmSubmitButton({
  triggerLabel,
  triggerChildren,
  triggerClassName,
  title,
  description,
  confirmLabel = "Confirmer",
  confirmClassName = "danger-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold",
  cancelLabel = "Annuler",
  pendingLabel = "Suppression...",
  requireText,
  requireTextLabel,
  requireTextPlaceholder,
  showSpinner = true,
  ariaLabel,
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState("");

  const needsTextConfirmation = Boolean(requireText);
  const isTextConfirmed =
    !needsTextConfirmation ||
    confirmationValue.trim().toLowerCase() === requireText?.trim().toLowerCase();

  function closeModal() {
    setOpen(false);
    setConfirmationValue("");
  }

  return (
    <>
      <button
        type="button"
        data-interactive="true"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerChildren ?? triggerLabel}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#0c0910]/35 backdrop-blur-[2px]"
              onClick={closeModal}
              aria-label="Fermer la confirmation"
            />

            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="ambient-ring relative z-10 w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(44,47,49,0.45)]"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[#0c0910]">{title}</h3>
                  <p className="text-sm leading-6 text-[#0c0910]/68">{description}</p>
                </div>
              </div>

              {needsTextConfirmation ? (
                <label className="mt-5 block space-y-2 text-sm font-medium text-[#0c0910]">
                  {requireTextLabel ?? `Tapez "${requireText}" pour confirmer`}
                  <input
                    type="text"
                    value={confirmationValue}
                    onChange={(event) => setConfirmationValue(event.target.value)}
                    className="form-input text-sm"
                    placeholder={requireTextPlaceholder ?? requireText}
                  />
                </label>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  data-interactive="true"
                  onClick={closeModal}
                  className="secondary-button px-4 py-2 text-sm font-semibold"
                >
                  {cancelLabel}
                </button>
                <SubmitButton
                  className={confirmClassName}
                  pendingLabel={pendingLabel}
                  showSpinner={showSpinner}
                  disabled={!isTextConfirmed}
                >
                  {confirmLabel}
                </SubmitButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
