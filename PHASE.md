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
- **Déploiement** : appliquer toutes les migrations attendues sur chaque environnement (dont `feedback` si pas encore fait).
- **UI** : passe par zone (shell → catalogue → contenu) en respectant `DESIGN.md` et les tokens `globals.css`.
- **Qualité** : tests E2E ciblés quand le périmètre MVP est stable.
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

