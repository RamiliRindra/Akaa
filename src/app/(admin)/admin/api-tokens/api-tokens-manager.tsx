"use client";

import { UserRole } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useActionState, useState } from "react";

import {
  generateApiTokenAction,
  initialGenerateApiTokenState,
  initialRevokeApiTokenState,
  revokeApiTokenAction,
} from "@/actions/api-tokens";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";

type ApiTokenUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  hasToken: boolean;
  tokenSuffix: string | null;
  tokenCreatedAt: string | null;
};

type ApiTokensManagerProps = {
  users: ApiTokenUser[];
};

const roleLabels: Record<UserRole, string> = {
  LEARNER: "Apprenant",
  TRAINER: "Formateur",
  ADMIN: "Admin",
};

const roleBadgeStyle: Record<UserRole, string> = {
  LEARNER: "bg-[#0F63FF]/10 text-[#0F63FF]",
  TRAINER: "bg-[#453750]/10 text-[#453750]",
  ADMIN: "bg-[#119da4]/10 text-[#119da4]",
};

export function ApiTokensManager({ users }: ApiTokensManagerProps) {
  const [generateState, generateFormAction, generatePending] = useActionState(
    generateApiTokenAction,
    initialGenerateApiTokenState,
  );
  const [revokeState, revokeFormAction, revokePending] = useActionState(
    revokeApiTokenAction,
    initialRevokeApiTokenState,
  );

  // Cible en cours de mutation — permet de n'afficher le spinner que sur la
  // ligne concernée plutôt que de geler tout le tableau.
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<ApiTokenUser | null>(null);

  function handleStartAction(userId: string) {
    setPendingUserId(userId);
  }

  function closeConfirmModal() {
    setConfirmUser(null);
  }

  const totalUsers = users.length;
  const activeTokens = users.filter((u) => u.hasToken).length;

  return (
    <div className="space-y-6">
      {/* Nouveau jeton généré — banniere one-shot */}
      <AnimatePresence mode="wait">
        {generateState.status === "success" ? (
          <NewTokenBanner
            key={`token-${generateState.generatedAt}`}
            token={generateState.token}
            userEmail={generateState.userEmail}
            userName={generateState.userName}
            generatedAt={generateState.generatedAt}
          />
        ) : null}
      </AnimatePresence>

      {/* Erreurs globales */}
      {generateState.status === "error" ? (
        <InlineBanner type="error" message={generateState.error} />
      ) : null}
      {revokeState.status === "error" ? (
        <InlineBanner type="error" message={revokeState.error} />
      ) : null}
      {revokeState.status === "success" ? (
        <InlineBanner
          type="success"
          message={`Jeton révoqué pour ${revokeState.userEmail}.`}
        />
      ) : null}

      {/* Indicateurs */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Comptes éligibles"
          value={totalUsers}
          hint="Formateurs + admins"
          accent="#0F63FF"
        />
        <StatCard
          label="Jetons actifs"
          value={activeTokens}
          hint="Autant de comptes peuvent appeler /api/v1"
          accent="#119da4"
        />
        <StatCard
          label="Sans jeton"
          value={totalUsers - activeTokens}
          hint="Ces comptes n’accèdent pas à l’API IA"
          accent="#453750"
        />
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border border-[#0c0910]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9ff] text-[#0c0910]/70">
              <tr>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut jeton</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-[#0c0910]/60"
                  >
                    Aucun formateur ou administrateur pour le moment.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isRowPending =
                    (generatePending || revokePending) &&
                    pendingUserId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-t border-[#0c0910]/8 align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#0c0910]">
                          {user.name ?? "Sans nom"}
                        </p>
                        <p className="text-xs text-[#0c0910]/60">{user.email}</p>
                        {!user.isActive ? (
                          <p className="mt-1 text-xs font-medium text-[#c2410c]">
                            Compte désactivé
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyle[user.role]}`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.hasToken ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#119da4]/10 px-2.5 py-1 text-xs font-semibold text-[#119da4]">
                              <ShieldCheck className="h-3.5 w-3.5" /> Jeton actif
                            </span>
                            <span className="text-xs text-[#0c0910]/60">
                              Suffixe : <code>…{user.tokenSuffix}</code>
                            </span>
                            {user.tokenCreatedAt ? (
                              <span className="text-xs text-[#0c0910]/50">
                                Créé le {formatDate(new Date(user.tokenCreatedAt))}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0c0910]/5 px-2.5 py-1 text-xs font-semibold text-[#0c0910]/60">
                            Aucun jeton
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <form action={generateFormAction}>
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />
                            <button
                              type="submit"
                              disabled={!user.isActive || isRowPending}
                              onClick={() => handleStartAction(user.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0F63FF] px-3 py-2 text-xs font-semibold !text-white transition hover:bg-[#0F63FF]/90 disabled:cursor-not-allowed disabled:bg-[#0c0910]/20"
                            >
                              {isRowPending && generatePending ? (
                                <>
                                  <Spinner className="h-3.5 w-3.5" />
                                  <span>...</span>
                                </>
                              ) : user.hasToken ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  <span>Régénérer</span>
                                </>
                              ) : (
                                <>
                                  <KeyRound className="h-3.5 w-3.5" />
                                  <span>Générer</span>
                                </>
                              )}
                            </button>
                          </form>

                          {user.hasToken ? (
                            <button
                              type="button"
                              onClick={() => setConfirmUser(user)}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Révoquer</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmation de révocation */}
      <AnimatePresence>
        {confirmUser ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#0c0910]/35 backdrop-blur-[2px]"
              onClick={closeConfirmModal}
              aria-label="Fermer la confirmation"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(44,47,49,0.45)]"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[#0c0910]">
                    Révoquer le jeton API ?
                  </h3>
                  <p className="text-sm leading-6 text-[#0c0910]/70">
                    Le compte{" "}
                    <strong className="text-[#0c0910]">
                      {confirmUser.email}
                    </strong>{" "}
                    ne pourra plus appeler l&apos;API <code>/api/v1</code>. Les
                    agents IA configurés avec cet ancien jeton devront être mis
                    à jour.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmModal}
                  className="rounded-lg border border-[#0c0910]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0c0910] transition hover:bg-[#0c0910]/5"
                >
                  Annuler
                </button>
                <form
                  action={revokeFormAction}
                  onSubmit={() => {
                    handleStartAction(confirmUser.id);
                    closeConfirmModal();
                  }}
                >
                  <input type="hidden" name="userId" value={confirmUser.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Révoquer définitivement
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sous-composants
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[#0c0910]/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-[#0c0910]/60">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-2 text-xs text-[#0c0910]/50">{hint}</p>
    </div>
  );
}

function InlineBanner({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const isError = type === "error";
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#119da4]/20 bg-[#119da4]/10 text-[#0c0910]"
      }`}
    >
      {message}
    </div>
  );
}

function NewTokenBanner({
  token,
  userEmail,
  userName,
  generatedAt,
}: {
  token: string;
  userEmail: string;
  userName: string | null;
  generatedAt: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore : l'utilisateur peut toujours sélectionner et copier à la main.
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border-2 border-[#ffc857] bg-[#fffaf0] p-5 shadow-[0_12px_32px_-12px_rgba(255,200,87,0.5)]"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc857]/30 text-[#0c0910]">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-[#0c0910]">
              Nouveau jeton API généré pour{" "}
              <span className="font-bold">{userName ?? userEmail}</span>
            </h3>
            <p className="mt-1 text-xs text-[#0c0910]/70">
              Copiez-le dès maintenant et transmettez-le à l&apos;agent IA
              concerné. <strong>Ce jeton ne sera plus jamais affiché.</strong>{" "}
              Généré le {formatDate(new Date(generatedAt))}.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 overflow-x-auto rounded-lg bg-[#0c0910] px-4 py-3 font-mono text-xs !text-white">
              {token}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F63FF] px-4 py-3 text-sm font-semibold !text-white transition hover:bg-[#0F63FF]/90"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[#0c0910]/60">
            Destinataire : <strong>{userEmail}</strong> — ce compte peut
            désormais appeler <code>/api/v1/*</code> avec le header{" "}
            <code>Authorization: Bearer {token.slice(0, 9)}…</code>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
