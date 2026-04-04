# Rapport d’avancement — Phases 1 & 2

## Phase 1 — Fondations
Date: 2026-04-02

### Objectif
Mettre en place les fondations backend/infrastructure de la plateforme Akaa:
- Schéma Prisma
- Connexion DB Prisma
- Authentification NextAuth v5
- Protection des routes par rôle
- Variables d’environnement
- Vérifications techniques avant passage en Phase 2

### Ce qui a été fait

#### 1) Schéma Prisma
Fichier: `prisma/schema.prisma`

- Schéma structuré par domaines (Auth, Contenu, Évaluation, Progression, Gamification).
- Contraintes critiques gamification appliquées:
  - `xp_transaction.user_id -> user.id` avec `ON DELETE CASCADE` + index
  - `user_badge.user_id -> user.id` avec `ON DELETE CASCADE` + index
  - `streak.user_id -> user.id` avec `ON DELETE CASCADE` + index
  - `user_badge.granted_by -> user.id` nullable avec `ON DELETE SET NULL`
- Contraintes métier appliquées:
  - `UNIQUE(user_id, badge_id)` sur `user_badge`
  - `UNIQUE(user_id, course_id)` sur `enrollment`
  - `UNIQUE(user_id, chapter_id)` sur `chapter_progress`
  - `UNIQUE(chapter_id)` sur `quiz`
  - `course.category_id` nullable avec `ON DELETE SET NULL`
  - `course.trainer_id` avec `ON DELETE CASCADE` + index
- Modèle `User` avec `total_xp` (cache dénormalisé) et `level`.

#### 2) Prisma 7.6 — adaptation obligatoire
Fichiers:
- `prisma.config.ts`
- `src/lib/db.ts`

Actions:
- Ajout de `prisma.config.ts` pour la config datasource (Prisma 7 n’utilise plus `url`/`directUrl` dans `schema.prisma`).
- Lecture de `.env.local` dans `prisma.config.ts` pour récupérer `DIRECT_URL`.
- Installation initiale des dépendances runtime Prisma 7 (`@prisma/adapter-pg`, `pg`), puis adaptation Neon serverless pendant la Phase 2.
- Mise en place du singleton PrismaClient dans `src/lib/db.ts`.

#### 3) Authentification NextAuth v5
Fichiers:
- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/types/next-auth.d.ts`

Actions:
- Configuration NextAuth v5 avec:
  - `PrismaAdapter(db)`
  - Provider Google OAuth
  - Provider Credentials (email/password + vérification `bcryptjs`)
  - Session JWT
  - Enrichissement token/session avec le `role`
- Exposition des handlers `GET/POST` via route App Router.
- Augmentation des types NextAuth pour `session.user.id` et `session.user.role`.

#### 4) Protection des routes
Note: en Next.js 16, la convention `middleware` est remplacée par `proxy`.

Fichier final:
- `src/proxy.ts`

Règles appliquées:
- Routes protégées apprenant: `/dashboard`, `/courses`, `/leaderboard`, `/profile`
- Routes formateur: `/trainer/*` (autorisé `TRAINER` et `ADMIN`)
- Routes admin: `/admin/*` (autorisé `ADMIN` uniquement)
- Redirection vers `/login` si non authentifié
- Redirection vers `/dashboard` si rôle insuffisant

#### 5) Variables d’environnement
Fichier: `.env.local`

Préparé avec:
- `DATABASE_URL` (Neon pooled)
- `DIRECT_URL` (Neon direct)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

#### 6) Script de vérification technique
Fichier: `scripts/verify-phase1.mjs`

Le script vérifie:
- Relations `User -> XpTransaction`, `User -> UserBadge -> Badge`, `User -> Streak`
- Cascade delete sur suppression d’un user pour tables gamification
- Option `KEEP_AUTH_USER=1` pour conserver un compte credentials de test

### Validation exécutée (Phase 1)
- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`

### Commandes de validation opérationnelle
Contexte local Madagascar/TGN: les migrations Prisma TCP sont bloquées; migration via Neon SQL Editor (voir `JOURNAL.md`).

---

## Phase 2 — Authentification & Layouts
Date: 2026-04-03

### Objectif
Implémenter strictement la Phase 2:
- Interfaces login/register
- Validation Zod
- Intégration NextAuth v5 (Credentials + Google OAuth)
- Architecture de layouts (`auth`, `platform`, `trainer`, `admin`)
- Providers globaux (`SessionProvider`, `QueryClientProvider`)
- Protection des routes par rôle

### Implémentation réalisée

#### 1) Authentification (UI + logique)
Fichiers principaux:
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/google-button.tsx`
- `src/lib/validations/auth.ts`
- `src/actions/auth.ts`
- `src/lib/auth.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`

Points livrés:
- Formulaire login/register avec validation Zod.
- Messages d’erreur en français.
- Action serveur `registerWithCredentials` (bcrypt + Prisma).
- Provider Credentials opérationnel.
- Bouton Google OAuth intégré.
- Types NextAuth enrichis (`session.user.id`, `session.user.role`).

Durcissements ajoutés:
- Normalisation email en login/register.
- Logs Prisma/Auth détaillés pour diagnostic.
- Fallback profil Google (nom garanti).
- Option `GOOGLE_OAUTH_DISABLED="true"` pour désactiver Google en local instable.

#### 2) Root layout + providers
Fichiers:
- `src/app/layout.tsx`
- `src/components/providers/app-providers.tsx`

Points livrés:
- `SessionProvider` + `QueryClientProvider` branchés au niveau racine.

#### 3) Layouts par zone
- Auth: `src/app/(auth)/layout.tsx`
- Platform: `src/app/(platform)/layout.tsx` + shell/sidebar/header/mobile nav
- Trainer: `src/app/(trainer)/trainer/layout.tsx`
- Admin: `src/app/(admin)/admin/layout.tsx`

Pages placeholders créées pour valider architecture et navigation:
- `dashboard`, `courses`, `leaderboard`, `profile`
- `trainer/dashboard`, `trainer/courses`
- `admin/dashboard`, `admin/users`, `admin/courses`, `admin/categories`, `admin/badges`, `admin/xp`

#### 4) Protection des routes (Next.js 16)
Fichier:
- `src/proxy.ts`

Règles:
- `/trainer/*` autorisé `TRAINER|ADMIN`
- `/admin/*` autorisé `ADMIN`
- routes learner protégées par authentification

#### 5) Ajustements infra/réseau
Fichiers:
- `src/lib/db.ts`
- `package.json`

Points livrés:
- Adaptation Prisma Neon serverless.
- Script dev avec préférence IPv4:
  - `NODE_OPTIONS=--dns-result-order=ipv4first next dev`

#### 6) Déploiement Railway (complément, 2026-04-03)
Contexte: réseau local TGN incompatible avec Neon (WSS) / Google ; l’app est déployée sur **Railway** (aligné avec `ARCHITECTURE.md`: Next.js + Neon + variables d’environnement).

Fichiers / scripts touchés:
- `package.json`: `postinstall` → `prisma generate` ; `build` → `prisma generate && next build` (le build CI n’exécutait pas la génération du client Prisma, d’où l’échec TypeScript sur `Prisma` importé depuis `@prisma/client`).
- `prisma.config.ts`: résolution de `DIRECT_URL` avec repli sur `DATABASE_URL` (variables Railway) et URL factice de dernier recours pour `prisma generate` sans `.env.local` (aucune connexion réelle au moment du generate).
- `src/app/(auth)/login/page.tsx`: enveloppe `<Suspense>` autour de `LoginForm` (exigence Next.js 16 / `useSearchParams()` lors du prérendu).
- `src/actions/auth.ts` (déjà en place): messages d’erreur réseau / timeout DB plus explicites pour l’inscription.

Variables Railway à prévoir (identiques en intention à `.env.local` / `ARCHITECTURE.md`):
- `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (URL publique HTTPS du service), `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Commande de démarrage recommandée côté prod (migrations hors réseau TGN):
- `npx prisma migrate deploy && npm run start`

### Validation technique exécutée (Phase 2)
- `npm run lint`
- `npx tsc --noEmit`
- `npx prisma generate`
- `npm run build`

Résultat:
- ✅ TypeScript OK
- ✅ Lint OK
- ✅ Build production OK

### Tests manuels et statut
- Credentials: flux fonctionnel validé sur **Railway** (login email / mot de passe OK).
- Google OAuth: configuration Google Cloud + callback Railway validées ; **Google OAuth OK sur Railway** après activation du linking email pour les comptes déjà existants.
- Schéma SQL `account` vérifié conforme côté Neon.
- Promotion admin vérifiée côté Neon pour `rindra@nexthope.net`.
- **Déploiement Railway:** build `npm run build` vert après correctifs Prisma + Suspense ; service déployé opérationnel.

Statut global Phase 2:
- ✅ Implémentation code terminée.
- ✅ Déploiement Railway validé (build + mise en ligne).
- ✅ Auth credentials validée en production.
- ✅ Google OAuth validé en production.
- ✅ Phase 2 terminée.

---

## Phase 3 — Contenu pédagogique
Date: 2026-04-04

### Objectif
Lancer le socle de la phase 3 conformément à `ARCHITECTURE.md`:
- CRUD formateur des cours
- gestion des modules et chapitres
- éditeur riche Tiptap pour les chapitres
- catalogue apprenant filtrable
- page détail cours
- lecteur de chapitre avec contenu + vidéo

### Implémentation réalisée

#### 1) Socle contenu et validations
Fichiers:
- `src/lib/utils.ts`
- `src/lib/content.ts`
- `src/lib/validations/course.ts`
- `src/actions/courses.ts`

Points livrés:
- Helpers `slugify()` et `formatDate()`.
- Détection / normalisation des vidéos supportées (`YouTube`, `Google Drive`).
- Document JSON riche par défaut pour les chapitres.
- Validations Zod pour:
  - cours
  - modules
  - chapitres
  - déplacements / suppressions
- Server Actions dédiées dans `src/actions/courses.ts` avec double vérification:
  - session obligatoire
  - rôle `TRAINER|ADMIN`
  - contrôle de propriété du cours pour le formateur

#### 2) Espace formateur
Fichiers:
- `src/app/(trainer)/trainer/courses/page.tsx`
- `src/app/(trainer)/trainer/courses/new/page.tsx`
- `src/app/(trainer)/trainer/courses/[courseId]/edit/page.tsx`
- `src/app/(trainer)/trainer/courses/[courseId]/chapters/[chapterId]/edit/page.tsx`
- `src/components/editor/rich-text-editor.tsx`
- `src/components/editor/chapter-editor-form.tsx`
- `src/components/feedback/form-feedback.tsx`

Points livrés:
- Liste des cours du formateur.
- Création de cours:
  - titre
  - description
  - catégorie
  - miniature
  - durée estimée
  - statut
- Édition d’un cours existant.
- Ajout / modification / suppression de modules.
- Réordonnancement fonctionnel des modules via actions `up/down`.
- Création / suppression / réordonnancement des chapitres.
- Page dédiée d’édition de chapitre avec **Tiptap**.
- Support des embeds vidéo:
  - YouTube
  - Google Drive

#### 3) Parcours apprenant
Fichiers:
- `src/app/(platform)/courses/page.tsx`
- `src/app/(platform)/courses/[slug]/page.tsx`
- `src/app/(platform)/courses/[slug]/learn/[chapterId]/page.tsx`
- `src/components/course/category-filter.tsx`
- `src/components/course/course-card.tsx`
- `src/components/course/course-status-badge.tsx`
- `src/components/course/rich-content-renderer.tsx`
- `src/components/course/video-embed.tsx`

Points livrés:
- Catalogue des cours publiés.
- Filtrage par catégorie.
- Fiche détail d’un cours:
  - modules
  - chapitres
  - progression calculée à partir de `ChapterProgress` existant
- Lecteur de chapitre:
  - navigation précédent / suivant
  - rendu du contenu riche JSON
  - vidéo embarquée si disponible

#### 4) Dépendances ajoutées
- `@tiptap/react`
- `@tiptap/starter-kit`

### Validation technique exécutée (Phase 3)
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Résultat:
- ✅ Lint OK
- ✅ TypeScript OK
- ✅ Build production OK

### Statut global Phase 3
- ✅ Socle fonctionnel phase 3 implémenté.
- ✅ CRUD cours / modules / chapitres disponible.
- ✅ Catalogue / détail / lecture apprenant disponibles.
- ✅ Éditeur Tiptap intégré.
- ⚠️ Réordonnancement livré en version fonctionnelle par boutons `haut/bas` ; pas encore en drag & drop visuel.
- ⚠️ Progression affichée en lecture seule à partir des données existantes ; le tracking automatique détaillé reste aligné avec la Phase 4.
