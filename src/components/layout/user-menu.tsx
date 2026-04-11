"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, CircleHelp, LogOut, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState, useTransition } from "react";

import { HELP_CENTER_URL } from "@/lib/help-center";
import { Spinner } from "@/components/ui/spinner";

type UserMenuProps = {
  name: string;
  email?: string | null;
  /** Photo de profil (OAuth, etc.) — domaines autorisés dans `next.config.ts`. */
  image?: string | null;
  role: "LEARNER" | "TRAINER" | "ADMIN";
  workspace: "platform" | "trainer" | "admin";
  className?: string;
  onNavigate?: () => void;
};

const roleLabels: Record<UserMenuProps["role"], string> = {
  LEARNER: "Apprenant",
  TRAINER: "Formateur",
  ADMIN: "Admin",
};

type Workspace = UserMenuProps["workspace"];

const workspaceLabels: Record<Workspace, string> = {
  platform: "Vue apprenant",
  trainer: "Vue formateur",
  admin: "Vue admin",
};

function getWorkspaceHref(workspace: Workspace) {
  if (workspace === "trainer") return "/trainer/dashboard";
  if (workspace === "admin") return "/admin/dashboard";
  return "/courses";
}

function getAvailableWorkspaces(role: UserMenuProps["role"]): Workspace[] {
  if (role === "ADMIN") return ["platform", "trainer", "admin"];
  if (role === "TRAINER") return ["platform", "trainer"];
  return ["platform"];
}

function getDefaultHomeForRole(role: UserMenuProps["role"]) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "TRAINER") return "/trainer/dashboard";
  return "/dashboard";
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "A";

  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function UserMenu({ name, email, image, role, workspace, className, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const showAvatar = Boolean(image) && !avatarFailed;
  const destinationHref = role === "LEARNER" ? "/profile" : getDefaultHomeForRole(role);
  const destinationLabel = role === "LEARNER" ? "Mon profil" : "Mon espace";
  const workspaces = getAvailableWorkspaces(role);

  return (
    <div className={`relative ${className ?? ""}`}>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="ambient-ring absolute bottom-[calc(100%+0.65rem)] left-0 right-0 z-20 overflow-hidden rounded-[1.35rem] bg-white/96 p-2 shadow-[0_20px_45px_-24px_rgba(44,47,49,0.42)] backdrop-blur"
          >
            {workspaces.length > 1 ? (
              <div className="mb-1 space-y-1 rounded-[1rem] bg-[var(--color-surface-high)] p-2">
                {workspaces.map((item) => {
                  const isActive = item === workspace;

                  return (
                    <Link
                      key={item}
                      href={getWorkspaceHref(item)}
                      data-interactive="true"
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      className={`flex items-center justify-between rounded-[0.9rem] px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? "bg-[var(--color-primary-bright)] !text-white"
                          : "text-[var(--color-text-dark)]/76 hover:bg-white hover:text-[#0050d6]"
                      }`}
                    >
                      <span>{workspaceLabels[item]}</span>
                      {isActive ? (
                        <span className="rounded-full bg-white/18 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                          Actif
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <Link
              href={destinationHref}
              data-interactive="true"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-[var(--color-text-dark)]/82 hover:bg-[var(--color-primary-bright)]/6 hover:text-[#0050d6]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-low)]">
                <UserRound className="h-4 w-4" />
              </span>
              <span>{destinationLabel}</span>
            </Link>

            <a
              href={HELP_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-interactive="true"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-[var(--color-text-dark)]/82 transition hover:bg-[var(--color-primary-bright)]/6 hover:text-[#0050d6]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-low)]">
                <CircleHelp className="h-4 w-4" aria-hidden />
              </span>
              <span>Centre d’aide</span>
            </a>

            <button
              type="button"
              data-interactive="true"
              onClick={() => {
                startTransition(async () => {
                  await signOut({ callbackUrl: "/login" });
                });
              }}
              disabled={isPending}
              className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-sm font-medium text-[var(--color-text-dark)]/82 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-low)]">
                {isPending ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              </span>
              <span>{isPending ? "Déconnexion..." : "Déconnexion"}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        data-interactive="true"
        onClick={() => setOpen((value) => !value)}
        className="ambient-ring flex w-full items-center gap-3 rounded-[1.35rem] bg-white/78 px-3 py-3 text-left shadow-[0_16px_28px_-22px_rgba(44,47,49,0.38)] backdrop-blur hover:bg-white/92"
      >
        {showAvatar ? (
          <span className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/90 shadow-sm">
            <Image
              src={image!}
              alt={name ? `Photo de ${name}` : "Profil"}
              width={44}
              height={44}
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          </span>
        ) : (
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(0,80,214,0.16),rgba(15,99,255,0.12))] text-sm font-bold text-[#0050d6]">
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--color-text-dark)]">{name}</span>
          <span className="block truncate text-xs text-[var(--color-text-dark)]/58">
            {email ?? roleLabels[role]}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-[var(--color-primary-bright)]/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#0050d6]">
            {roleLabels[role]}
          </span>
          <ChevronUp
            className={`h-4 w-4 text-[var(--color-text-dark)]/46 transition-transform ${open ? "" : "rotate-180"}`}
          />
        </span>
      </button>
    </div>
  );
}
