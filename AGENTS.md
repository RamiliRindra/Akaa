<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Akaa — Agent Briefing

Plateforme e-learning gamifiée. ~300 utilisateurs. 3 rôles : Apprenant, Formateur, Admin.

## Stack technique

- **Framework** : Next.js 16.2.2, React 19.2.4, TypeScript 5 (strict)
- **Router** : App Router uniquement (`src/app/`). Server Components par défaut. `"use client"` seulement si hooks/events/browser APIs.
- **Mutations** : Server Actions dans `src/actions/`. Chaque action vérifie session + rôle avant toute opération.
- **Styling** : Tailwind CSS v4 via PostCSS. Config CSS-first dans `src/app/globals.css` (`@theme inline`). Pas de `tailwind.config.js`. **Light mode uniquement** (pas de `dark:` variants).
- **ORM** : Prisma 7.6.0. Schema dans `prisma/schema.prisma`. UUID pour toutes les PK. Relations explicites avec `onDelete`.
- **BDD** : PostgreSQL sur Neon (free tier). URL pooled pour `DATABASE_URL`, URL directe pour `DIRECT_URL`.
- **Auth** : NextAuth v5 (beta 30) + `@auth/prisma-adapter`. Providers : Google OAuth + Credentials (email/password via bcryptjs).
- **Validation** : Zod 4. Schemas dans `src/lib/validations/`. Messages d'erreur en français.
- **State client** : React Query (`@tanstack/react-query`) pour cache, polling, optimistic updates.
- **Animations** : Framer Motion. Micro-interactions gamifiées (XP toast, badge unlock, quiz feedback).
- **Icônes** : Lucide React.
- **Composants UI** : shadcn/ui dans `src/components/ui/`.
- **Éditeur rich text** : Tiptap (contenu stocké en JSONB dans la colonne `chapter.content`).
- **Vidéos** : embed YouTube / Google Drive uniquement. Pas de stockage fichier côté serveur.
- **Logo** : `src/img/logo_akaa.png`. Affiché via `next/image`. Emplacements : sidebar, landing, login.
- **Couleurs** : Primary `#0F63FF` (bleu Akaa). Secondaires : `#453750` (XP/violet), `#0c0910` (texte), `#ffc857` (accent/or), `#119da4` (succès/teal).

## Structure des dossiers

```
src/
├── app/
│   ├── (auth)/                  # Login, register. Layout minimal centré.
│   ├── (platform)/              # Espace apprenant. Sidebar + header gamifié.
│   │   ├── dashboard/           # Hub central : XP, streaks, cours en cours
│   │   ├── courses/             # Catalogue filtrable par catégorie
│   │   │   └── [slug]/          # Détail cours + learn/[chapterId]
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── (trainer)/trainer/       # Espace formateur. CRUD cours/modules/chapitres/quiz.
│   │   ├── dashboard/
│   │   └── courses/             # Liste, new, [courseId]/edit
│   ├── (admin)/admin/           # Espace admin. Accès total.
│   │   ├── dashboard/           # Stats globales
│   │   ├── users/               # Gestion utilisateurs + rôles
│   │   ├── courses/             # Gestion tous les cours
│   │   ├── categories/          # CRUD catégories de formation
│   │   ├── badges/              # CRUD badges
│   │   └── xp/                  # Ajustement XP manuel
│   ├── api/auth/[...nextauth]/  # Route NextAuth
│   ├── layout.tsx               # Root layout (fonts, metadata, providers)
│   ├── page.tsx                 # Landing page publique
│   └── globals.css              # Tailwind v4 tokens + theme
├── components/
│   ├── ui/                      # shadcn/ui
│   ├── auth/                    # LoginForm, RegisterForm, GoogleButton
│   ├── course/                  # CourseCard, ChapterViewer, VideoEmbed, CategoryFilter
│   ├── quiz/                    # QuizPlayer, QuestionCard, ResultScreen
│   ├── dashboard/               # StatsCards, ProgressChart, Calendar
│   ├── gamification/            # XPBar, BadgeCard, StreakCounter, LevelBadge, Leaderboard
│   ├── editor/                  # RichTextEditor (Tiptap), CourseBuilder
│   └── layout/                  # Sidebar, Header, MobileNav
├── img/
│   └── logo_akaa.png            # Logo Akaa (bleu #0F63FF)
├── lib/
│   ├── auth.ts                  # Config NextAuth v5
│   ├── db.ts                    # Singleton PrismaClient
│   ├── gamification.ts          # Logique XP, badges auto, streaks, niveaux
│   ├── utils.ts                 # cn(), formatDate(), slugify()
│   └── validations/             # Schemas Zod (auth, course, category, quiz)
├── hooks/                       # useCurrentUser, useXP, useCourseProgress
├── actions/                     # Server Actions (auth, courses, quiz, gamification, admin)
├── middleware.ts                # Protection routes par rôle
└── types/index.ts               # Types TypeScript partagés

prisma/
├── schema.prisma                # 15 modèles, 5 domaines
├── seed.ts                      # Admin, badges, catégories, cours démo
└── migrations/
```

## Commandes locales

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build production
npm run build

# Démarrer en production
npm run start

# Lint
npm run lint

# Prisma — générer le client après modification du schema
npx prisma generate

# Prisma — créer et appliquer une migration
npx prisma migrate dev --name nom_de_la_migration

# Prisma — seed de la base de données
npx prisma db seed

# Prisma — ouvrir Prisma Studio (explorateur BDD visuel)
npx prisma studio

# Prisma — reset complet (drop + migrate + seed)
npx prisma migrate reset
```

## Contraintes strictes

### Base de données — Relations critiques

- **XpTransaction -> User** : `xp_transaction.user_id` référence `user.id`. FK avec ON DELETE CASCADE. Index obligatoire sur `user_id`. Chaque gain ou perte d'XP crée une ligne dans cette table.
- **UserBadge -> User** : `user_badge.user_id` référence `user.id`. FK avec ON DELETE CASCADE. Contrainte UNIQUE sur `(user_id, badge_id)` — un badge ne peut être attribué qu'une fois par utilisateur.
- **UserBadge -> Badge** : `user_badge.badge_id` référence `badge.id`. FK avec ON DELETE CASCADE.
- **UserBadge.granted_by -> User** : FK nullable vers `user.id` avec ON DELETE SET NULL. Null = badge automatique, sinon = ID de l'admin qui l'a attribué.
- **Streak -> User** : `streak.user_id` référence `user.id`. FK avec ON DELETE CASCADE. Contrainte UNIQUE — un seul streak par utilisateur.
- **User.total_xp** : champ dénormalisé (cache). Doit être mis à jour à chaque insertion dans `xp_transaction` : `total_xp = total_xp + amount`. Ne jamais recalculer via SUM() en runtime.
- **User.level** : calculé depuis `total_xp` avec la formule `floor(total_xp / 100) + 1`.

### Base de données — Autres contraintes

- **Course.category_id -> Category.id** : FK nullable avec ON DELETE SET NULL. Si une catégorie est supprimée, les cours perdent leur catégorie mais ne sont pas supprimés.
- **Course.trainer_id -> User.id** : FK avec ON DELETE CASCADE. Index obligatoire.
- **Enrollment** : UNIQUE sur `(user_id, course_id)`. Un utilisateur ne s'inscrit qu'une fois par cours.
- **ChapterProgress** : UNIQUE sur `(user_id, chapter_id)`.
- **Quiz.chapter_id** : UNIQUE. Un seul quiz par chapitre.
- Toutes les FK doivent avoir un index explicite dans le schema Prisma.
- Toutes les PK sont des UUID v4 (`@default(uuid())`).

### Rôles et accès

- **LEARNER** : accès lecture aux cours publiés, inscription, suivi, quiz, gamification.
- **TRAINER** : tout LEARNER + CRUD sur ses propres cours/modules/chapitres/quiz.
- **ADMIN** : accès total. CRUD utilisateurs, catégories, badges, ajustement XP manuel, gestion de tous les cours.
- Le middleware (`src/middleware.ts`) bloque les routes `(trainer)/*` si rôle != TRAINER|ADMIN, et `(admin)/*` si rôle != ADMIN.
- Les Server Actions re-vérifient le rôle côté serveur (double vérification obligatoire).

### Code et conventions

- Server Components par défaut. `"use client"` uniquement si nécessaire.
- Toute mutation passe par une Server Action (jamais de fetch POST direct depuis le client).
- Validation Zod obligatoire sur chaque Server Action avant toute opération BDD.
- Interface entièrement en français. Messages d'erreur en français.
- Mobile-first. Chaque composant doit fonctionner sur 3 breakpoints (mobile < 640px, tablette 640-1024px, desktop > 1024px).
- Imports via alias `@/` (pointe vers `src/`).
- Fichiers en kebab-case, composants en PascalCase, fonctions en camelCase.
- à chaque fin de phase mettre un rapport de ce qui a été fait et appliqué dans le fichier '/PHASE.md'

### UI et design

- **Light mode uniquement** pour le MVP. Pas de `dark:` variants Tailwind ni de `prefers-color-scheme: dark`.
- Logo : `src/img/logo_akaa.png` (affiché via `next/image`).
- Couleur primaire : `#0F63FF`. Secondaires : `#453750` (XP), `#0c0910` (texte), `#ffc857` (accent/récompense), `#119da4` (succès).
- L'UI complète sera intégrée en dernier (Phase 7). Pendant les phases 1-6, utiliser des composants fonctionnels simples avec les bons tokens de couleur.

### Documents de référence

- Architecture complète : `ARCHITECTURE.md`
- Conventions techniques : `.cursor/rules/stack.mdc`
- Règles UX et gamification : `.cursor/rules/ux.mdc`
