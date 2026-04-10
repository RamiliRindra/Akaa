import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCachedSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

import { ApiTokensManager } from "./api-tokens-manager";

/**
 * Page admin `/admin/api-tokens`
 *
 * Permet aux administrateurs :
 * - de voir tous les comptes TRAINER/ADMIN actifs ;
 * - de générer un nouveau jeton API pour un compte (affiché une seule fois) ;
 * - de révoquer un jeton existant.
 *
 * Les jetons sont utilisés par l'API `/api/v1/*` et par le serveur MCP
 * wrapper pour permettre aux agents IA (Claude, ChatGPT, etc.) de piloter
 * Akaa programmatiquement.
 */
export default async function AdminApiTokensPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({
    where: {
      role: { in: [UserRole.TRAINER, UserRole.ADMIN] },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      apiToken: true,
      apiTokenCreatedAt: true,
    },
  });

  // Ne jamais renvoyer le plaintext du jeton au client — on expose seulement
  // l'existence, la date de création et un suffixe masqué pour reconnaître
  // visuellement le jeton si besoin.
  const safeUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hasToken: Boolean(user.apiToken),
    tokenSuffix: user.apiToken ? user.apiToken.slice(-4) : null,
    tokenCreatedAt: user.apiTokenCreatedAt?.toISOString() ?? null,
  }));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#0c0910]">
          Jetons API IA programmatique
        </h2>
        <p className="text-sm leading-6 text-[#0c0910]/70">
          Ces jetons permettent aux agents IA (Claude, ChatGPT, serveur MCP
          Akaa) de piloter la plateforme au nom d&apos;un formateur ou d&apos;un
          administrateur via l&apos;API <code>/api/v1/*</code>. Un seul jeton
          actif par compte : générer un nouveau jeton révoque automatiquement
          l&apos;ancien. Le jeton en clair n&apos;est affiché qu&apos;une seule
          fois — pensez à le copier immédiatement.
        </p>
      </div>

      <ApiTokensManager users={safeUsers} />
    </section>
  );
}
