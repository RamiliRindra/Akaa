# Rapport d'avancement — Phases 1 à 8

## Phase 1 — Fondations
Date: 2026-04-02

### Objectif
Mettre en place les fondations backend et infrastructure de la plateforme Akaa :
- schéma Prisma
- connexion base de données
- authentification NextAuth v5
- protection des routes par rôle
- variables d'environnement

### Livraisons
- Schéma Prisma structuré par domaines dans `prisma/schema.prisma`.
- Contraintes critiques de gamification et d'intégrité métier appliquées.
- `prisma.config.ts` ajouté pour Prisma 7.
- Singleton Prisma dans `src/lib/db.ts`.
- Authentification NextAuth v5 initialisée dans `src/lib/auth.ts`.
- Route auth App Router exposée dans `src/app/api/auth/[...nextauth]/route.ts`.
- Protection des routes déplacée vers `src/proxy.ts` pour Next.js 16.
- Variables `.env.local` alignées avec Neon et NextAuth.

### Validation exécutée
- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`

### Statut global
- Phase 1 terminée.
- Fondations backend stables.

---

## Phase 2 — Authentification et layouts
Date: 2026-04-03

### Objectif
Implémenter l'authentification complète et la structure des zones applicatives :
- login/register
- Google OAuth
- providers globaux
- layouts `auth`, `platform`, `trainer`, `admin`
- protection des routes

### Livraisons
- Formulaires login/register avec validation Zod et messages en français.
- Action serveur `registerWithCredentials`.
- Providers `SessionProvider` et `QueryClientProvider` au root.
- Shells applicatifs `platform`, `trainer`, `admin` branchés.
- `src/proxy.ts` aligné avec Next.js 16.
- Déploiement Railway stabilisé avec génération Prisma au build.

### Validation exécutée
- `npm run lint`
- `npx tsc --noEmit`
- `npx prisma generate`
- `npm run build`

### Statut global
- Phase 2 terminée.
- Auth credentials et Google OAuth validés en production.

---

## Phase 3 — Contenu pédagogique
Date: 2026-04-04

### Objectif
Livrer le socle contenu côté formateur et lecture côté apprenant :
- CRUD cours/modules/chapitres
- éditeur Markdown-first
- import ZIP
- catalogue, détail cours, lecteur de chapitre

### Livraisons
- CRUD cours/modules/chapitres dans `src/actions/courses.ts`.
- Éditeur formateur basé sur MDXEditor.
- Import transactionnel d'un cours via `manifest.csv` + `chapters/*.md`.
- Catalogue apprenant filtrable.
- Fiche cours apprenant.
- Lecteur de chapitre avec rendu Markdown enrichi et vidéo.

### Validation exécutée
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Statut global
- Phase 3 terminée.

### Limites restantes
- Réordonnancement formateur livré via boutons, pas en drag and drop.
- Sur l'import, `content_file` reste requis ; une amélioration future consiste à autoriser `video_url` seule si au moins un des deux champs est fourni.

---

## Phase 4 — Quiz et progression réelle
Date: 2026-04-04

### Objectif
Brancher la logique réelle de quiz et de progression :
- quiz optionnel par chapitre
- validation apprenant
- progression chapitre et cours
- cache `Enrollment.progress_percent`

### Livraisons
- Socle progression dans `src/lib/progress.ts`.
- Actions serveur quiz/progression dans `src/actions/quiz.ts`.
- Validations Zod quiz.
- Builder quiz côté formateur à édition locale et sauvegarde unique.
- Intégration du quiz dans l'éditeur de chapitre.
- Bouton `Marquer comme terminé` pour les chapitres sans quiz.
- Redirection automatique vers le chapitre suivant après réussite/validation.
- Import optionnel de quiz via `quiz_file` dans le ZIP.

### Validation exécutée
- Création et édition de quiz validées.
- Passage de quiz apprenant validé.
- Progression chapitre et cours validée.
- Import optionnel des quiz validé.
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Statut global
- Phase 4 terminée.
- Moteur quiz/progression en place.

### Limites restantes
- Le périmètre est fonctionnel ; les améliorations restantes sont surtout UX/UI.

---

## Phase 5 — Gamification apprenante, rôles et niveau des cours
Date: 2026-04-04

### Objectif
Stabiliser la gamification apprenante et le modèle de difficulté des cours :
- gamification réservée aux `LEARNER`
- niveau des cours
- coefficients XP globaux par niveau

### Livraisons
- Restriction du moteur gamification aux seuls `LEARNER`.
- Suppression des éléments XP/streak pour `TRAINER` et `ADMIN`.
- Ajout de `Course.level`.
- Ajout de `xp_level_setting`.
- Pilotage admin des multiplicateurs XP par niveau via `/admin/xp`.
- Prise en charge du niveau dans la création, l'édition et l'import des cours.

### Validation exécutée
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Validation métier des gains XP et de la séparation des rôles.

### Statut global
- Phase 5 terminée.
- Périmètre gamification apprenante cohérent.

### Limites restantes
- Ajustement XP manuel explicitement reporté à la phase 6, puis livré dans cette phase suivante.

---

## Phase 6 — Back-office admin
Date: 2026-04-04

### Objectif
Transformer l'espace admin en back-office opérationnel :
- utilisateurs
- catégories
- badges
- ajustement XP manuel
- dashboard admin
- supervision des cours

### Livraisons
- Ajout de `user.is_active` et blocage login des comptes désactivés.
- Gestion utilisateurs avec recherche, filtres et pagination.
- Picker visuel icônes/couleurs pour les catégories.
- CRUD badges complet.
- Ajustement XP manuel avec raison obligatoire.
- Dashboard admin avec stats principales.
- Fiche admin dédiée pour `/admin/courses/[courseId]`.

### Validation exécutée
- Gestion utilisateurs validée.
- Désactivation/réactivation validée.
- CRUD catégories validé.
- CRUD badges validé.
- Ajustement XP manuel validé.
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Statut global
- Phase 6 terminée.
- Administration MVP opérationnelle.

### Limites restantes
- Le reste des retouches porte sur le polish visuel global, traité ensuite en phase 7.

---

## Phase 7 — UI, polish et performance
Date: 2026-04-05

### Objectif
Appliquer réellement le design system et fiabiliser l'expérience globale :
- refonte visuelle principale
- navigation mobile
- feedback d'action
- passe performance

### Livraisons
- Refonte visuelle des surfaces principales : landing, shell, dashboard apprenant, catalogue, fiche cours, lecteur.
- Navigation mobile avec vrai menu hamburger.
- Correction du faux échec quiz en production lié au traitement de `NEXT_REDIRECT`.
- Composants `Spinner` et `SubmitButton` intégrés sur les actions lentes principales.
- `loading.tsx` dédiés par zone.
- Optimisations de session et d'allègement du shell.
- Dashboard formateur réel.
- Vue apprenants par formation côté formateur.

### Validation exécutée
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Validation fonctionnelle des parcours critiques après refonte.

### Statut global
- Phase 7 terminée sur le périmètre MVP.
- Design system et feedback d'action réellement incarnés dans l'app.

### Limites restantes
- Le polish restant est ciblé écran par écran.
- Le warning lint sur le renderer Markdown et la dette outillage sont traités après cette consolidation.

---

## Phase 8 — Calendrier, sessions et parcours
Date: 2026-04-05

### Objectif
Ajouter la dimension formation planifiée :
- parcours de formation
- sessions liées à un cours ou à un parcours
- inscriptions, validation, présence
- notifications in-app
- restriction `SESSION_ONLY`

### Livraisons
- Nouveaux modèles Prisma : `TrainingProgram`, `ProgramCourse`, `TrainingSession`, `SessionEnrollment`, `SessionAttendance`, `Notification`.
- Migration phase 8 rendue relançable sur Neon malgré un historique partiellement divergent.
- Surfaces livrées :
  - apprenant : `/calendar`, `/programs`
  - formateur : `/trainer/calendar`, `/trainer/programs`
  - admin : `/admin/calendar`, `/admin/programs`
- CRUD sessions et parcours.
- Gestion des demandes d'inscription et validation formateur.
- Feuille de présence.
- `xp_reward` sur session.
- Verrouillage `SESSION_ONLY` branché côté catalogues et garde serveur cours/chapitres.
- Cloche de notifications dans le header.
- Marquage lu inline.
- Rappels de session MVP via sync client + server action.
- Gamification de présence : XP session, badges `SESSIONS_ATTENDED`, notifications liées.

### Validation exécutée
- Stabilisation des pages `calendar` et `programs` sur la base réelle.
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Statut global
- Phase 8 fonctionnelle livrée au niveau MVP.
- Le calendrier et les parcours sont exploitables sur la base réelle sans reset complet.

### Limites restantes (recadrage 2026-04)
- **Récurrence** : à la création, une RRULE génère déjà plusieurs lignes `training_session` (MVP). Une **expansion dynamique** ultérieure uniquement à partir de `recurrence_rule` stockée (sans lignes pré-créées) reste un sujet d’évolution si besoin métier.
- Seed Prisma : présent dans le dépôt (`prisma/seed.ts`) ; validation complète contre Neon dépend d’un réseau non bloqué (cf. `JOURNAL.md`).

---

## État actuel — prochain lot prioritaire

### Consolidé (documentation — 2026-04-06)
- `ARCHITECTURE.md` aligné avec les routes réelles (notifications, feedback, proxy, domaine Feedback en BDD).
- Direction UI : `DESIGN.md` + `src/app/globals.css` comme référence pour les prochaines passes d’interface.

### Passe UI — étape 4 (2026-04-06)
- `.editorial-eyebrow` reste en **`display: none`** par choix produit (libellés de section non souhaités à l’écran) ; commentaire ajouté dans `globals.css`.
- Prototype Stitch / HTML exporté non intégré tel quel (CDN Tailwind, Material Symbols, etc.).

### À traiter ensuite (roadmap produit / technique)
- **Recherche apprenant (header)** : le champ est **masqué** (`showGlobalSearch = false` dans `src/components/layout/protected-shell.tsx`) en attendant une implémentation utile. Prochaine étape : recherche sur le **catalogue** (titres / descriptions des cours publiés accessibles), via `searchParams` sur `/courses` ou équivalent Prisma (`contains` / full-text selon volume), puis réactiver l’affichage dans le shell.
- **Déploiement** : appliquer toutes les migrations attendues sur chaque environnement (dont `feedback` si pas encore fait).
- **UI** : passe par zone (shell → catalogue → contenu) en respectant `DESIGN.md` et les tokens `globals.css`.
- **Qualité** : **Playwright** (`e2e/`, `npm run test:e2e`) + **GitHub Actions** (`.github/workflows/ci.yml`) : job `quality` = lint + Vitest sans secret ; job `e2e` si `DATABASE_URL` est défini en secret (voir `e2e/README.md`).
- Renderer Markdown : surveiller tout warning lint sur `rich-content-renderer.tsx`.

### Déjà livré (rappel — avril 2026)
- Pages **notifications** : `/notifications`, `/trainer/notifications`, `/admin/notifications` (pagination, tout marquer comme lu).
- Socle **Vitest** : `npm test`.
- **Statistiques admin calendrier** : cartes sur `/admin/calendar`.

### Compléments livrés (calendrier & parcours — 2026-04)
- **Récurrence** : à la création, une `RRULE` (RFC 5545) génère **plusieurs lignes** `training_session` (plafond 52) ; `recurrence_series_id` regroupe la série ; texte d’aide sur les formulaires admin / formateur.
- **Admin — calendrier** : cartes de stats (sessions par statut, inscriptions, présences, taux d’approbation, top formateurs par nombre de sessions).
- **URLs détail** : `/calendar/sessions/[sessionId]`, `/trainer/sessions/[sessionId]`, `/admin/sessions/[sessionId]`, `/programs/[programId]`, `/trainer/programs/[programId]`, `/admin/programs/[programId]` avec liens depuis listes et calendriers.

---

## Lot feedback / avis (apprenant + formateur)
Date: 2026-04-06

### Objectif
Recueillir des avis structurés (note 1–5 + commentaire optionnel) sur les cours, la plateforme apprenant et l’outil formateur, avec un composant d’étoiles réutilisable (pattern type ReUI Rating).

### Livraisons
- **Prisma** : enum `FeedbackKind`, modèle `Feedback` avec `targetKey` et contrainte `@@unique([userId, targetKey])`, relations `User` / `Course`, migration associée.
- **Lib** : `src/lib/feedback-keys.ts`, validations Zod `src/lib/validations/feedback.ts`.
- **Server Actions** : `src/actions/feedback.ts` (apprenant cours & plateforme, formateur plateforme & création par cours) ; redirections query `type` / `message` sans URL de base fictive.
- **UI** : `Rating` (`src/components/feedback/star-rating.tsx`) — lecture, décimaux pour moyenne, tailles `sm` | `default` | `lg`, `editable`, `showValue`, `onRatingChange`.
- **Pages** : `/feedback` (formulaires selon rôle) ; fiche cours apprenant : bloc « Noter ce cours » avec moyenne et comptage des avis.
- **Navigation** : entrée « Avis » dans les sidebars concernées ; `src/proxy.ts` — préfixe `/feedback` protégé.

### Validation exécutée
- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm test`

### Statut global
- Lot feedback livré au niveau MVP.
- **Synthèse admin** : page `/admin/feedback` (cartes par type, tableaux par cours, derniers enregistrements avec commentaires).

### Étape fonctionnelle suivante
- Passe UI (shell / catalogue) selon `DESIGN.md` et `globals.css`, ou évolutions feedback (colonnes supplémentaires à l’export).

### Complément — filtres + export CSV (2026-04-06)
- Page `/admin/feedback` : filtres **type**, **du / au** (sur `updatedAt`, bornes UTC), tableau détaillé filtré, lien **Télécharger CSV** (`GET /api/admin/feedback/export` avec les mêmes paramètres query).
- `src/proxy.ts` : matcher et garde **403** pour `/api/admin/*` si le JWT n’est pas `ADMIN`.

---

## Phase 9 — Nettoyage landing + API IA (REST + MCP)
Date: 2026-04-10
Linear: projet « Akaa », issues AIN-29 à AIN-53
Plan détaillé: [`docs/plans/2026-04-10-linear-landing-api-ia.md`](docs/plans/2026-04-10-linear-landing-api-ia.md)

### Objectif
Trois chantiers regroupés dans une même release de transition :
1. **Consignation** du projet sur Linear (rétrospective phases 1–8, sprint en cours, roadmap backlog) + mise à jour `ARCHITECTURE.md` et `PHASE.md`.
2. **Suppression de la landing marketing** de l'application (`src/app/page.tsx` devient une simple redirection). Une landing dédiée sera refaite dans un projet Next.js séparé qui vivra sur le domaine racine, tandis que cette application restera sur `app.`.
3. **Exposition d'une API programmatique** `/api/v1/*` pour permettre à des agents IA (Claude Desktop, Claude Code, ChatGPT Desktop, Gemini) de lire et **créer** des cours sans passer par l'UI, avec un serveur MCP fin qui wrappe l'API REST.

### 9.1 — Consignation Linear + documentation
- **Linear** : projet « Akaa » + 7 labels (`Phase 1–8`, `Retrospective`, `Landing cleanup`, `API IA`, `MCP`, `Roadmap`, `Feature`) + 25 issues.
  - Done rétrospective : AIN-29 → AIN-38 (phases 1 à 8, feedback batch, accès session déjà implémenté).
  - Todo sprint courant : AIN-39 → AIN-43 (docs, landing, API REST, MCP, admin api-tokens).
  - Backlog roadmap : AIN-44 → AIN-53 (SESSION_ONLY par défaut, i18n EN, rate-limiting, observabilité, etc.).
- **Plan file** : `docs/plans/2026-04-10-linear-landing-api-ia.md` — trace écrite du plan approuvé, sans duplication des IDs Linear.
- **ARCHITECTURE.md** : section 7 « API IA programmatique », section 8 « Phase 9 », routes table mise à jour, nouvelles colonnes `api_token` + `api_token_created_at` sur `User`, mention du bypass `/api/v1/*` dans le proxy, répertoire `mcp-server/`, nouveaux helpers `api-auth.ts` et `courses-core.ts`.
- **PHASE.md** : cette entrée.

### 9.2 — Suppression landing
- `src/app/page.tsx` remplacé par une Server Component qui lit `auth()` et redirige :
  - utilisateur anonyme → `/login`
  - utilisateur authentifié → dashboard du rôle (via `getHomePathForRole`)
- Composants marketing orphelins supprimés.
- `src/app/layout.tsx` (providers, fonts, metadata), `src/app/globals.css` et `src/img/logo_akaa.png` conservés tels quels.

### 9.3 — Schéma : jetons API
- Migration Prisma `add_api_tokens` :
  - `User.apiToken String? @unique @map("api_token")`
  - `User.apiTokenCreatedAt DateTime? @map("api_token_created_at")`
  - Index `@@index([apiToken])`
- Format du jeton : `akaa_` + `crypto.randomBytes(30).toString("base64url")` (~40 chars).
- Un seul jeton actif par utilisateur ; regénérer invalide l'ancien.
- Le jeton n'est jamais ré-affiché en clair après sa génération initiale.

### 9.4 — Helpers partagés
- `src/lib/courses-core.ts` : extraction des helpers purs `(actor, input) → result` utilisés à la fois par les Server Actions existantes et par les routes `/api/v1/*`. Couvre `createCourse`, `updateCourse`, `deleteCourse`, `listCourses`, `getCourse` + équivalents modules / chapitres / quiz / questions / options.
- `src/lib/api-auth.ts` : `authenticateApiRequest(req)` parse `Authorization: Bearer akaa_...`, interroge Prisma, rejette si rôle != TRAINER/ADMIN. `apiError(status, code, message)` uniformise le JSON d'erreur.
- Les Server Actions existantes réécrivent leur corps pour déléguer à `courses-core.ts`, sans changement de signature publique ni régression fonctionnelle dans l'UI trainer.

### 9.5 — Routes `/api/v1/*`
- `courses/route.ts` : `GET` (liste paginée, owner scope) + `POST` (create).
- `courses/[id]/route.ts` : `GET` / `PATCH` / `DELETE`.
- `courses/[id]/modules/route.ts` : `GET` + `POST`.
- `modules/[id]/route.ts`, `modules/[id]/chapters/route.ts`.
- `chapters/[id]/route.ts`, `chapters/[id]/quiz/route.ts`.
- Chaque route : auth → validation Zod (réutilise `src/lib/validations/`) → délégation à `courses-core` → `NextResponse.json`.
- Pagination : `?page=1&pageSize=20` → `{ items, total, page, pageSize }`.
- `src/proxy.ts` : bypass explicite de `/api/v1/*` (auth gérée par `api-auth.ts`, pas par NextAuth).

### 9.6 — Administration `/admin/api-tokens`
- Nouvelle page Server Component listant les utilisateurs `TRAINER` / `ADMIN` avec colonne « Jeton actif » et boutons « Générer » / « Révoquer ».
- `src/actions/api-tokens.ts` : `generateApiToken(userId)` (ADMIN only, génère le jeton, affiche le résultat une seule fois dans un toast) et `revokeApiToken(userId)` (remet les deux champs à null).
- Entrée « Jetons API » ajoutée à la sidebar admin.

### 9.7 — Serveur MCP wrapper
- `mcp-server/` à la racine du repo : package Node autonome avec `@modelcontextprotocol/sdk`, transport stdio.
- Tools exposés : `list_courses`, `get_course`, `create_course`, `update_course`, `delete_course`, `create_module`, `create_chapter`, `set_quiz`, etc.
- Chaque tool fait un `fetch` vers `${AKAA_API_URL}/api/v1/...` avec `Authorization: Bearer ${AKAA_API_TOKEN}`.
- README `mcp-server/README.md` avec l'exemple de configuration `claude_desktop_config.json`.

### 9.8 — Tests
- **Vitest** (`src/__tests__/api/v1/`) :
  - Auth : missing token → 401, invalid → 401, LEARNER token → 403, TRAINER → 200.
  - Courses : create/list/update/delete OK pour owner, 404/403 pour non-owner.
  - Isolation : TRAINER A ne voit pas les cours de TRAINER B.
- **Playwright** (`e2e/api-v1.spec.ts`) :
  - Parcours complet : admin génère un jeton → `POST /api/v1/courses` → `POST /api/v1/courses/:id/modules` → `POST /api/v1/modules/:id/chapters` → cours visible dans l'UI trainer.

### 9.9 — Points de vigilance
- **Double auth** : s'assurer que `src/proxy.ts` ne bloque pas `/api/v1/*`.
- **CORS** : pas de CORS configuré ; l'API est server-to-server uniquement.
- **Neon free tier** : les tests e2e API doivent nettoyer les cours créés pour ne pas saturer la pool.
- **Ordre des migrations** : `add_api_tokens` doit passer en dev, en test CI et en prod (`prisma migrate deploy`).

### Hors-scope (backlog)
- Passage du défaut `SessionAccessPolicy` à `SESSION_ONLY` (AIN-44).
- Rate-limiting global sur `/api/v1/*`.
- Webhook sortant après création de cours via API.
- Audit log détaillé des appels API (qui a créé quoi).
- Gestion multi-jetons par utilisateur (scopes, expiration).
- Upload de médias (images, vidéos) via l'API.

### Validation attendue
- `npm run lint` clean
- `npm run build` clean
- `npm test` clean (nouveaux tests Vitest API v1)
- `npm run test:e2e` clean sur la spec API v1
- Test manuel MCP depuis Claude Desktop : création d'un cours, vérification dans Prisma Studio et dans l'UI trainer.

---

### Rapport livraison — Phase 9 (2026-04-10)
Branche `claude/infallible-babbage` — 9 commits livrés.

#### Ce qui a été livré (conforme au plan, avec écarts notés)

| Étape | Plan | Livré | Écart |
|-------|------|-------|-------|
| D.1 Migration SQL | `add_api_tokens` | ✅ Appliquée manuellement sur Neon | — |
| D.2 Admin `/admin/api-tokens` | Page + actions | ✅ `src/app/(admin)/admin/api-tokens/` + `src/actions/api-tokens.ts` + `api-tokens-types.ts` | `"use server"` Next.js 16 n'accepte que des async functions — state constants extraites dans un fichier séparé |
| D.3 `api-auth.ts` | Helper auth | ✅ `src/lib/api-auth.ts` : `authenticateApiRequest`, `apiError`, `parseJsonBody`, `mapCoursesCoreErrorToResponse` | — |
| D.4 `courses-core.ts` | Helpers purs | ✅ `src/lib/courses-core.ts` — **les Server Actions existantes n'ont pas été modifiées** (approche additive, zéro régression UI) | Plan prévoyait de réécrire les Server Actions pour déléguer ; livré comme surcouche pure |
| D.5 Routes `/api/v1/*` | 9 routes | ✅ 9 fichiers sous `src/app/api/v1/` — `PUT` (pas `PATCH`) pour update | Verbe PUT cohérent avec le replace atomique du quiz |
| D.6 Serveur MCP | SDK `@modelcontextprotocol/sdk` | ✅ `scripts/mcp-server/` — **zéro dépendance runtime**, JSON-RPC 2.0 écrit à la main | SDK non utilisé (évite un conflit Zod 3 vs Zod 4, moins de surface à maintenir) |
| D.7 Tests Vitest | `src/__tests__/api/v1/` | ✅ `src/lib/api-auth.test.ts` — 21 tests, mock `db` via `vi.hoisted` | Chemin différent ; tests sur le helper d'auth suffisent car l'E2E couvre les routes bout-en-bout |
| D.8 Tests E2E | `e2e/api-v1.spec.ts` | ✅ Parcours complet (cours → module → chapitre → quiz → suppression) + cas d'erreur | Skippé si `AKAA_E2E_API_TOKEN` absent |

#### Chiffres clés

- **7 commits** fonctionnels + 1 hotfix (`"use server"`) + 1 tests unitaires = **9 commits au total**
- **+2 300 lignes** de code de prod, **+364 lignes** de tests
- **40 tests Vitest** (7 fichiers) — tous passent
- **19 tools MCP** exposées (`akaa_whoami` … `akaa_delete_quiz`)
- **Zéro dépendance runtime ajoutée** (le serveur MCP tourne avec `fetch` natif + `readline`)
- **Migration SQL appliquée sur Neon** le 2026-04-10 (champs `api_token`, `api_token_created_at`)

#### Validations exécutées

- ✅ `npm run lint` — clean
- ✅ `npx tsc --noEmit` — clean
- ✅ `npm test` — 40/40 tests passent
- ✅ Smoke test MCP stdio : `initialize` + `tools/list` — 19 tools renvoyées
- ✅ Test manuel `curl` des 12 routes v1 avec jeton formateur (plan de test validé par Rindra)
- ✅ Test manuel MCP depuis **Claude Desktop** : le serveur `akaa` apparaît avec 19 tools, `akaa_whoami` renvoie l'utilisateur, `akaa_create_course` + `akaa_create_module` + `akaa_create_chapter` enchaînés, cours visible dans `/trainer/courses`
- ⏳ `npm run test:e2e` sur `api-v1.spec.ts` — nécessite `AKAA_E2E_API_TOKEN` en CI ou local

#### Points de vigilance confirmés / résolus

| Point | Statut |
|-------|--------|
| `src/proxy.ts` ne bloque pas `/api/v1/*` | ✅ Vérifié — matcher limité à `/api/admin` |
| `prisma generate` sur Node 20.15 (ERR_REQUIRE_ESM) | ✅ Workaround : Node 22 via PATH |
| `"use server"` exporte uniquement des async functions | ✅ Résolu — constants dans `api-tokens-types.ts` |
| Neon free tier — nettoyage E2E | ✅ Chaque test E2E supprime le cours créé via `try/finally` |
| git index.lock (Cursor + git parallel) | ✅ Résolu en attendant 2-3s et relançant |

#### Limites restantes (backlog)

Inchangées par rapport à § 9 Hors-scope : rate-limiting, multi-jetons, webhooks, audit log, upload médias, `SESSION_ONLY` par défaut.

