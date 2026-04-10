# Plan — Landing removal + API IA (REST + MCP)

**Date** : 2026-04-10
**Branche** : `claude/infallible-babbage`
**Statut** : Approuvé par l'utilisateur
**Linear** : projet "Akaa" (issues AIN-29 → AIN-53)

---

## Contexte

Trois travaux sont regroupés dans ce plan :

1. **Retirer la landing page** (`src/app/page.tsx`). Elle sera refaite dans un projet marketing séparé. Le bouton d'entrée unique est `/login`. L'utilisateur déjà connecté est redirigé vers son dashboard de rôle.
2. **Vérifier l'accès cours/parcours par session**. Après inspection, `SessionAccessPolicy` (OPEN/SESSION_ONLY), `src/lib/session-access.ts` et les wrappers de catalogue existent déjà. **Aucun code n'est ajouté.** On note seulement dans le roadmap le passage du défaut à `SESSION_ONLY` pour une phase ultérieure.
3. **Exposer une API programmatique pour agents IA** (Claude, ChatGPT, Gemini) capable de **lire** et surtout **créer** des cours. Approche retenue : **API REST versionnée `/api/v1/*` + serveur MCP fin qui wrappe les routes REST**. L'API est non-invasive, elle reprend la logique des Server Actions existantes.

Ordre d'exécution strict imposé par l'utilisateur :

> Phase A (Linear) → Phase B (documentation : plan file + ARCHITECTURE.md + PHASE.md) → Phase C (suppression landing) → Phase D (API REST + MCP).

---

## Phase A — Consignation Linear (terminée)

Projet créé dans le workspace Linear :
- **Projet** "Akaa" — e-learning gamifié, Next.js 16 + Prisma 7 + NextAuth v5
- **Labels** : `Phase 1–8`, `Retrospective`, `Landing cleanup`, `API IA`, `MCP`, `Roadmap`, `Feature`

25 issues créées :
- **Done (retrospective)** : AIN-29 à AIN-38 (phases 1 à 8 + feedback batch + accès session déjà implémenté)
- **Todo (sprint en cours)** : AIN-39 à AIN-43 (docs, landing, API, MCP)
- **Backlog (roadmap)** : AIN-44 à AIN-53 (SESSION_ONLY par défaut, i18n, rate-limiting, observabilité, etc.)

Les IDs Linear vivent dans Linear ; ce fichier ne les duplique pas pour éviter les divergences.

---

## Phase B — Documentation (en cours)

### B.1 — Ce fichier

`docs/plans/2026-04-10-linear-landing-api-ia.md` sert de trace écrite du plan approuvé, pour que les futurs agents et reviewers retrouvent les décisions d'architecture sans relire l'historique de chat.

### B.2 — Mise à jour de `ARCHITECTURE.md`

- **Retirer** toute mention de la landing marketing (`src/app/page.tsx` en tant que page d'accueil publique). La racine devient une simple redirection.
- **Ajouter** une section "API v1 (agents IA)" couvrant :
  - endpoints `/api/v1/*`
  - authentification `Authorization: Bearer akaa_...`
  - format JSON strict, pagination `?page=&pageSize=`
  - matrice rôles ↔ opérations (TRAINER = ses cours, ADMIN = tous)
  - champs `User.apiToken`, `User.apiTokenCreatedAt`
  - page d'administration `/admin/api-tokens`
- **Ajouter** une section "Serveur MCP Akaa" expliquant que c'est un wrapper stdio autour de l'API REST, consommé par Claude Desktop / Claude Code / ChatGPT Desktop.
- **Mettre à jour** le diagramme de modules pour inclure `src/lib/courses-core.ts` et `src/lib/api-auth.ts`.

### B.3 — Mise à jour de `PHASE.md`

Ajouter une section **Phase 9 — Nettoyage landing + API IA** avec sous-sections :
- 9.1 Suppression de la landing
- 9.2 Schéma Prisma (`api_token`, `api_token_created_at` sur `user`)
- 9.3 Helpers `api-auth.ts` et `courses-core.ts`
- 9.4 Routes REST `/api/v1/courses|modules|chapters|quizzes`
- 9.5 Serveur MCP wrapper
- 9.6 Tests Vitest + Playwright
- 9.7 Administration `/admin/api-tokens`

---

## Phase C — Suppression de la landing

### C.1 — `src/app/page.tsx`

Remplacer intégralement par une Server Component qui redirige :

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHomePathForRole } from "@/lib/auth-config";

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(getHomePathForRole(session.user.role));
  }
  redirect("/login");
}
```

### C.2 — Composants marketing orphelins

Identifier et supprimer tout composant qui n'était utilisé que par la landing (à grepper après édition de `page.tsx`). Ne **pas** toucher :
- `src/app/layout.tsx` (providers, fonts, metadata)
- `src/app/globals.css`
- `src/img/logo_akaa.png` (utilisé par sidebar + `/login`)

### C.3 — `metadata`

Vérifier que `src/app/layout.tsx` garde un `metadata` générique pour l'application (titre, description courte, pas de mention "landing marketing").

### C.4 — Vérification

- `npm run build` doit passer
- `npm run lint` doit passer
- Navigation manuelle : `/` anonyme → `/login` ; `/` apprenant connecté → `/dashboard` ; `/` formateur → `/trainer/dashboard` ; `/` admin → `/admin/dashboard`.

---

## Phase D — API REST + MCP wrapper

### D.1 — Migration Prisma `add_api_tokens`

Ajout sur le modèle `User` :

```prisma
apiToken          String?   @unique @map("api_token")
apiTokenCreatedAt DateTime? @map("api_token_created_at")

@@index([apiToken])
```

Commandes :
```bash
npx prisma migrate dev --name add_api_tokens
npx prisma generate
```

### D.2 — Page admin `/admin/api-tokens`

Nouvelle page Server Component listant les utilisateurs TRAINER/ADMIN avec colonne "Token actif" (booléen) + bouton "Générer" / "Révoquer". Actions :

- `generateApiToken(userId)` : vérifie rôle ADMIN, génère `akaa_ + crypto.randomBytes(30).toString("base64url")` (~40 chars), stocke hash si besoin d'audit, affiche le token en clair **une seule fois** dans un toast.
- `revokeApiToken(userId)` : vide `apiToken` et `apiTokenCreatedAt`.

Ajouter l'entrée dans la sidebar admin.

### D.3 — Helper `src/lib/api-auth.ts`

Deux fonctions :

```ts
export async function authenticateApiRequest(req: Request): Promise<
  | { user: User; role: UserRole }
  | { error: NextResponse }
>;

export function apiError(status: number, code: string, message: string): NextResponse;
```

- `authenticateApiRequest` parse `Authorization: Bearer akaa_...`, cherche `User` par `apiToken`, retourne user + rôle. Rejette si rôle != TRAINER/ADMIN.
- `apiError` renvoie un JSON uniforme `{ error: { code, message } }`.

### D.4 — Helpers purs `src/lib/courses-core.ts`

Extraire de `src/actions/courses.ts` (et modules/chapters/quiz) la logique métier en fonctions pures qui prennent `(actor: { id, role }, input)` et font les vérifs d'autorisation + Prisma :

- `createCourseForActor`
- `updateCourseForActor`
- `deleteCourseForActor`
- `listCoursesForActor`
- `getCourseForActor`
- idem pour modules, chapters, quizzes, questions, options

Les Server Actions existantes réécrivent leur corps pour appeler ces helpers après `revalidatePath`. **Aucune régression fonctionnelle** côté UI trainer.

### D.5 — Routes API `/api/v1/*`

Créer sous `src/app/api/v1/` :

- `courses/route.ts` — `GET` (list) + `POST` (create)
- `courses/[id]/route.ts` — `GET` / `PATCH` / `DELETE`
- `courses/[id]/modules/route.ts` — `GET` + `POST`
- `modules/[id]/route.ts` — `GET` / `PATCH` / `DELETE`
- `modules/[id]/chapters/route.ts` — `GET` + `POST`
- `chapters/[id]/route.ts` — `GET` / `PATCH` / `DELETE`
- `chapters/[id]/quiz/route.ts` — `GET` / `PUT` / `DELETE`

Chaque route :
1. `authenticateApiRequest(req)` → 401 si échec
2. Parse body via schéma Zod (réutiliser ceux de `src/lib/validations/`)
3. Appelle le helper pur approprié
4. Renvoie `NextResponse.json(result, { status })`

Pagination sur les `GET` de liste : `?page=1&pageSize=20`, réponse `{ items, total, page, pageSize }`.

### D.6 — Serveur MCP wrapper

Créer `mcp-server/` à la racine du repo (ou `scripts/mcp-server/`) :

- `package.json` séparé avec `@modelcontextprotocol/sdk`
- Tools exposés : `list_courses`, `get_course`, `create_course`, `update_course`, `delete_course`, `create_module`, `create_chapter`, `set_quiz`
- Chaque tool fait un `fetch` vers `${AKAA_API_URL}/api/v1/...` avec `Authorization: Bearer ${AKAA_API_TOKEN}`
- Variables d'env : `AKAA_API_URL`, `AKAA_API_TOKEN`
- README avec instructions Claude Desktop / Claude Code

### D.7 — Tests

**Vitest** (`src/__tests__/api/v1/`) :
- Auth : missing token → 401, invalid → 401, LEARNER token → 403, TRAINER → 200
- Courses : create/list/update/delete → OK pour owner, 404/403 pour non-owner
- Isolation : TRAINER A ne voit pas les cours de TRAINER B

**Playwright** (`e2e/api-v1.spec.ts`) :
- Parcours complet : admin génère un token → call `POST /api/v1/courses` → `POST /api/v1/courses/:id/modules` → `POST /api/v1/modules/:id/chapters` → cours visible dans l'UI trainer

### D.8 — Vérification end-to-end

- `npm run lint` clean
- `npm run build` clean
- `npm test` clean
- `npm run test:e2e` clean sur la spec API
- Test manuel MCP : lancer le serveur MCP depuis Claude Desktop, créer un cours, vérifier dans Prisma Studio

---

## Hors-scope explicite

- **Pas** de refonte auth (on garde NextAuth v5 beta 30)
- **Pas** de changement de policy session par défaut (reste OPEN, `SESSION_ONLY` backlog)
- **Pas** de rate-limiting global (backlog)
- **Pas** de webhook sortant (backlog)
- **Pas** de nouvelle landing marketing (projet séparé)

---

## Points de vigilance

1. **Double auth** : le middleware gère NextAuth pour `/trainer` et `/admin`. Il ne doit **pas** bloquer `/api/v1/*`. Ajouter un bypass explicite dans `src/middleware.ts`.
2. **CORS** : par défaut on refuse tout origin browser. L'API est serveur-à-serveur. Les tools MCP tournent en local ; pas besoin de CORS.
3. **Audit logs** : noter chaque `POST/PATCH/DELETE` dans `xp_transaction`-style ? Hors-scope, backlog.
4. **Rate-limit Neon free tier** : s'assurer que les tests e2e API ne saturent pas la pool. Mettre un petit `afterAll` de cleanup.
5. **Ordre des migrations** : `add_api_tokens` doit passer sur la base de dev et de test (`npx prisma migrate deploy` dans CI).
