# Akaa - Architecture Plateforme E-Learning Gamifiée

> Document de référence pour l'architecture technique du projet Akaa.
> Dernière mise à jour : 2 avril 2026

---

## 1. Vision produit

Akaa est une plateforme e-learning gamifiée destinée à ~300 utilisateurs, avec trois rôles distincts (Apprenant, Formateur, Admin). L'expérience d'apprentissage repose sur un système de progression engageant (XP, badges, streaks, leaderboard) et un contenu structuré en **Cours > Modules > Chapitres > Quiz**.

### Contraintes clés

- Plateforme gratuite (pas de monétisation)
- Contenu : texte riche (éditeur Tiptap) + vidéos embarquées (YouTube / Google Drive)
- Interface en français, architecture i18n-ready pour ajout futur de l'anglais
- Budget infrastructure minimal : Railway Hobby + Neon Free
- **Light mode uniquement** pour le MVP (dark mode envisagé en fin de projet)

### Identité visuelle

- **Logo** : `src/img/logo_akaa.png` (bleu sur fond noir/transparent)
- **Couleur primaire** : `#0F63FF` (bleu Akaa)
- **Couleurs secondaires** :
  - `#453750` — Violet sombre (XP, gamification)
  - `#0c0910` — Quasi-noir (texte principal)
  - `#ffc857` — Or chaud (récompenses, badges, streaks)
  - `#119da4` — Teal (succès, progression, complétion)

---

## 2. Infrastructure

```
┌─────────────┐     HTTPS      ┌──────────────────────┐
│  Navigateur │ ──────────────> │  Next.js 16          │
│  (Client)   │ <────────────── │  Railway Hobby       │
└─────────────┘                 │  8 Go RAM / 8 vCPU   │
      │                         └──────────┬───────────┘
      │                                    │
      │  Embed (iframe)                    │  Prisma 7 (Connection pooling)
      v                                    v
┌─────────────┐                 ┌──────────────────────┐
│  YouTube /   │                │  Neon PostgreSQL     │
│  Google Drive│                │  Free Tier           │
└─────────────┘                │  0.5 Go / 190h calc  │
                                └──────────────────────┘
                                           │
                                           │  NextAuth v5
                                           v
                                ┌──────────────────────┐
                                │  Google OAuth 2.0    │
                                └──────────────────────┘
```

### Composants

| Composant | Technologie | Détails |
|-----------|-------------|---------|
| **Application** | Next.js 16.2.2 sur Railway | App Router, Server Components, Server Actions |
| **Base de données** | Neon PostgreSQL (Free) | 0.5 Go stockage, 190h compute/mois, auto-suspend à 5 min |
| **ORM** | Prisma 7.6.0 | Schema unique, migrations, connection pooling via Neon |
| **Authentification** | NextAuth v5 + @auth/prisma-adapter | Google OAuth + Email/Password (bcryptjs) |
| **Médias** | YouTube / Google Drive embed | Zéro stockage côté serveur pour les vidéos |
| **Styling** | Tailwind CSS v4 | Config CSS-first via PostCSS, light mode uniquement |
| **State client** | React Query (TanStack) | Cache, invalidation, optimistic updates |
| **Validation** | Zod 4 | Schemas partagés client/serveur |
| **Animations** | Framer Motion | Transitions, micro-interactions gamifiées |
| **Icônes** | Lucide React | Icônes cohérentes et légères |

### Contraintes Neon Free Tier

- **Stockage** : 0.5 Go max. Pour ~300 utilisateurs avec contenu texte riche (pas de blobs), c'est largement suffisant.
- **Compute** : 190h/mois. Le compute auto-suspend après 5 min d'inactivité. Premier appel après suspend = cold start ~500ms.
- **Branching** : Disponible gratuitement pour l'environnement de développement.
- **Connection pooling** : Utiliser l'URL pooled de Neon (`-pooler` suffix) pour la connexion Prisma.

### Variables d'environnement (.env.local)

```env
# Base de données Neon
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/akaa?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/akaa?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
```

---

## 3. Schéma de base de données PostgreSQL

### 3.1 Vue d'ensemble

Le schéma est organisé en **5 domaines** :

1. **Authentification** : User, Account, Session, VerificationToken (tables NextAuth)
2. **Contenu pédagogique** : Category, Course, Module, Chapter
3. **Évaluation** : Quiz, QuizQuestion, QuizOption, QuizAttempt
4. **Progression** : Enrollment, ChapterProgress
5. **Gamification** : XpTransaction, Badge, UserBadge, Streak

### 3.2 Schéma détaillé

#### DOMAINE : Authentification

**User** - Table centrale, reliée à tous les domaines

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| image | TEXT | nullable | URL avatar |
| password_hash | TEXT | nullable | Null si auth Google uniquement |
| role | ENUM('LEARNER','TRAINER','ADMIN') | NOT NULL, default 'LEARNER' | |
| total_xp | INTEGER | NOT NULL, default 0 | **Champ dénormalisé** : mis à jour à chaque XpTransaction |
| level | INTEGER | NOT NULL, default 1 | Calculé : `floor(total_xp / 100) + 1` |
| email_verified | TIMESTAMP | nullable | |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

**Account** - Comptes OAuth (table NextAuth standard)

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** |
| type | VARCHAR | NOT NULL | "oauth" |
| provider | VARCHAR | NOT NULL | "google" |
| provider_account_id | VARCHAR | NOT NULL | |
| access_token | TEXT | nullable | |
| refresh_token | TEXT | nullable | |
| expires_at | INTEGER | nullable | |
| token_type | VARCHAR | nullable | |
| scope | VARCHAR | nullable | |
| id_token | TEXT | nullable | |

> UNIQUE(provider, provider_account_id)

**Session** / **VerificationToken** : tables NextAuth standard, gérées par @auth/prisma-adapter.

---

#### DOMAINE : Contenu pédagogique

**Category** - Catégories de formation, gérées par l'admin

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | Généré depuis name |
| description | TEXT | nullable | |
| color | VARCHAR(7) | NOT NULL, default '#6366f1' | Hex pour badge/tag UI |
| icon | VARCHAR(50) | NOT NULL, default 'BookOpen' | Nom icône Lucide |
| order | INTEGER | NOT NULL, default 0 | Tri dans le catalogue |
| is_active | BOOLEAN | NOT NULL, default true | Masquer sans supprimer |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

**Course** - Formations

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | |
| description | TEXT | nullable | |
| thumbnail_url | TEXT | nullable | URL image de couverture |
| status | ENUM('DRAFT','PUBLISHED','ARCHIVED') | NOT NULL, default 'DRAFT' | |
| trainer_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Formateur créateur |
| category_id | UUID | FK -> Category(id) ON DELETE SET NULL, nullable | **INDEX** - Catégorie de rattachement |
| estimated_hours | INTEGER | nullable | Durée estimée en heures |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

> **Relation** : `course.category_id` -> `category.id` (FK nullable, ON DELETE SET NULL).
> Si une catégorie est supprimée, les cours restent mais perdent leur catégorie.

**Module** - Sections d'un cours

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | nullable | |
| order | INTEGER | NOT NULL | Ordre d'affichage dans le cours |
| course_id | UUID | FK -> Course(id) ON DELETE CASCADE | **INDEX** |

**Chapter** - Contenu d'apprentissage

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| content | JSONB | nullable | Contenu Tiptap au format JSON |
| video_url | TEXT | nullable | URL YouTube ou Google Drive |
| video_type | ENUM('YOUTUBE','GDRIVE','NONE') | NOT NULL, default 'NONE' | |
| order | INTEGER | NOT NULL | Ordre dans le module |
| estimated_minutes | INTEGER | nullable | |
| module_id | UUID | FK -> Module(id) ON DELETE CASCADE | **INDEX** |

---

#### DOMAINE : Évaluation

**Quiz** - Un quiz par chapitre (optionnel)

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| passing_score | INTEGER | NOT NULL, default 70 | Pourcentage minimum pour réussir |
| xp_reward | INTEGER | NOT NULL, default 50 | XP gagnés si réussi |
| chapter_id | UUID | FK -> Chapter(id) ON DELETE CASCADE, UNIQUE | **Un seul quiz par chapitre** |

**QuizQuestion** - Questions QCM

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| question_text | TEXT | NOT NULL | |
| type | ENUM('SINGLE','MULTIPLE') | NOT NULL, default 'SINGLE' | Choix unique ou multiple |
| order | INTEGER | NOT NULL | |
| quiz_id | UUID | FK -> Quiz(id) ON DELETE CASCADE | **INDEX** |

**QuizOption** - Options de réponse

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| option_text | TEXT | NOT NULL | |
| is_correct | BOOLEAN | NOT NULL, default false | |
| question_id | UUID | FK -> QuizQuestion(id) ON DELETE CASCADE | **INDEX** |

**QuizAttempt** - Tentatives de quiz

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** |
| quiz_id | UUID | FK -> Quiz(id) ON DELETE CASCADE | **INDEX** |
| score | INTEGER | NOT NULL | Pourcentage obtenu (0-100) |
| passed | BOOLEAN | NOT NULL | score >= quiz.passing_score |
| answers | JSONB | NOT NULL | `{ "question_id": ["option_id", ...] }` |
| attempted_at | TIMESTAMP | NOT NULL, default now() | |

---

#### DOMAINE : Progression

**Enrollment** - Inscriptions aux cours

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | |
| course_id | UUID | FK -> Course(id) ON DELETE CASCADE | |
| enrolled_at | TIMESTAMP | NOT NULL, default now() | |
| completed_at | TIMESTAMP | nullable | null = en cours |
| progress_percent | INTEGER | NOT NULL, default 0 | **Cache** : recalculé à chaque ChapterProgress |

> UNIQUE(user_id, course_id) - Un utilisateur ne peut s'inscrire qu'une fois par cours.
> INDEX composite sur (user_id, course_id).

**ChapterProgress** - Suivi par chapitre

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | |
| chapter_id | UUID | FK -> Chapter(id) ON DELETE CASCADE | |
| status | ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED') | NOT NULL, default 'NOT_STARTED' | |
| started_at | TIMESTAMP | nullable | |
| completed_at | TIMESTAMP | nullable | |

> UNIQUE(user_id, chapter_id).

---

#### DOMAINE : Gamification

> **IMPORTANT** : Les tables XpTransaction, UserBadge et Streak sont toutes reliées au modèle User via `user_id`.
> C'est le coeur du système de gamification. Chaque FK dispose d'un index et d'une politique ON DELETE CASCADE
> pour garantir l'intégrité référentielle si un compte utilisateur est supprimé.

**XpTransaction** - Historique de tous les gains/pertes d'XP

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Relation critique vers User |
| amount | INTEGER | NOT NULL | Positif (gain) ou négatif (pénalité/ajustement admin) |
| source | ENUM('QUIZ','CHAPTER','STREAK','ADMIN','BADGE') | NOT NULL | Origine de la transaction |
| source_id | VARCHAR(255) | nullable | ID de la source (quiz_id, chapter_id, etc.) |
| description | VARCHAR(500) | nullable | Libellé lisible ("Quiz réussi : Les bases de Python") |
| created_at | TIMESTAMP | NOT NULL, default now() | |

> **Relation XP -> User** : `xp_transaction.user_id` référence `user.id`.
> Le champ `user.total_xp` est un **cache dénormalisé** mis à jour à chaque insertion :
> `UPDATE user SET total_xp = total_xp + NEW.amount, level = floor((total_xp + NEW.amount) / 100) + 1`
> Cela évite un `SUM()` coûteux à chaque affichage du dashboard.

**Badge** - Définitions de badges, gérés par l'admin

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | |
| description | TEXT | nullable | |
| icon_url | TEXT | NOT NULL | URL ou chemin vers l'icône SVG |
| condition_type | ENUM('XP_THRESHOLD','COURSES_COMPLETED','STREAK','QUIZ_PERFECT','MANUAL') | NOT NULL | |
| condition_value | INTEGER | nullable | Seuil numérique (ex: 1000 XP, 5 cours, 7 jours streak) |
| xp_bonus | INTEGER | NOT NULL, default 0 | XP bonus attribué quand le badge est débloqué |
| is_active | BOOLEAN | NOT NULL, default true | Admin peut désactiver |
| created_at | TIMESTAMP | NOT NULL, default now() | |

> Les badges avec `condition_type = MANUAL` sont attribués uniquement par l'admin.
> Les autres sont vérifiés automatiquement par le moteur de gamification après chaque action.

**UserBadge** - Table de jonction User <-> Badge

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **Relation critique vers User** |
| badge_id | UUID | FK -> Badge(id) ON DELETE CASCADE | **Relation vers Badge** |
| earned_at | TIMESTAMP | NOT NULL, default now() | |
| granted_by | UUID | FK -> User(id) ON DELETE SET NULL, nullable | null = automatique, sinon = admin_id |

> **UNIQUE(user_id, badge_id)** - Un utilisateur ne peut recevoir un badge qu'une seule fois.
> INDEX composite sur (user_id, badge_id).
> La colonne `granted_by` permet de distinguer les badges automatiques (null) des badges
> attribués manuellement par un admin (contient l'ID de l'admin).

**Streak** - Séries de jours consécutifs d'activité

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE, UNIQUE | **Un streak par utilisateur** |
| current_streak | INTEGER | NOT NULL, default 0 | Jours consécutifs actuels |
| longest_streak | INTEGER | NOT NULL, default 0 | Record personnel |
| last_activity_date | DATE | nullable | Dernier jour d'activité |

> Logique de mise à jour (appelée à chaque action de l'utilisateur) :
> - Si `last_activity_date` = aujourd'hui : rien à faire
> - Si `last_activity_date` = hier : `current_streak += 1`, update `longest_streak` si nouveau record
> - Sinon : `current_streak = 1` (streak cassé)
> - Toujours : `last_activity_date = today()`

### 3.3 Index recommandés

```sql
-- Performances requêtes fréquentes
CREATE INDEX idx_enrollment_user ON enrollment(user_id);
CREATE INDEX idx_enrollment_course ON enrollment(course_id);
CREATE INDEX idx_chapter_progress_user ON chapter_progress(user_id);
CREATE INDEX idx_xp_transaction_user ON xp_transaction(user_id);
CREATE INDEX idx_xp_transaction_created ON xp_transaction(created_at DESC);
CREATE INDEX idx_user_badge_user ON user_badge(user_id);
CREATE INDEX idx_course_category ON course(category_id);
CREATE INDEX idx_course_status ON course(status);
CREATE INDEX idx_course_trainer ON course(trainer_id);
CREATE INDEX idx_module_course ON module(course_id);
CREATE INDEX idx_chapter_module ON chapter(module_id);
CREATE INDEX idx_quiz_chapter ON quiz(chapter_id);
CREATE INDEX idx_quiz_question_quiz ON quiz_question(quiz_id);
CREATE INDEX idx_quiz_option_question ON quiz_option(question_id);
CREATE INDEX idx_quiz_attempt_user ON quiz_attempt(user_id);

-- Leaderboard (requête fréquente)
CREATE INDEX idx_user_total_xp ON "user"(total_xp DESC);
```

### 3.4 Règles de gamification

| Événement | XP gagnés | Source |
|-----------|-----------|--------|
| Compléter un chapitre | +10 XP | CHAPTER |
| Réussir un quiz | +50 XP (configurable par quiz) | QUIZ |
| Quiz score parfait (100%) | +25 XP bonus | QUIZ |
| Maintenir un streak de 7 jours | +30 XP | STREAK |
| Débloquer un badge avec xp_bonus | +xp_bonus du badge | BADGE |
| Ajustement admin | +/- variable | ADMIN |

**Niveaux** : `level = floor(total_xp / 100) + 1`
- Niveau 1 : 0-99 XP
- Niveau 2 : 100-199 XP
- Niveau 10 : 900-999 XP
- ...et ainsi de suite

**Badges prédéfinis (seed)** :

| Badge | Condition | Seuil | XP Bonus |
|-------|-----------|-------|----------|
| Premier Pas | Compléter 1 cours | COURSES_COMPLETED = 1 | 20 |
| Assidu | Streak de 7 jours | STREAK = 7 | 30 |
| Marathonien | Streak de 30 jours | STREAK = 30 | 100 |
| Quiz Master | 10 quiz parfaits | QUIZ_PERFECT = 10 | 50 |
| Érudit | 500 XP accumulés | XP_THRESHOLD = 500 | 25 |
| Expert | 2000 XP accumulés | XP_THRESHOLD = 2000 | 50 |

---

## 4. Structure des dossiers

```
akaa/
├── prisma/
│   ├── schema.prisma              # Schéma complet Prisma (15 modèles)
│   ├── seed.ts                    # Données de seed (admin, badges, catégories, cours démo)
│   └── migrations/                # Généré par prisma migrate
│
├── src/
│   ├── app/
│   │   ├── (auth)/                # Route group : authentification
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx         # Layout minimal centré, sans sidebar
│   │   │
│   │   ├── (platform)/            # Route group : espace apprenant
│   │   │   ├── dashboard/page.tsx          # Hub central : XP, streaks, cours en cours
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx                # Catalogue filtrable par catégorie
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx            # Détail cours + inscription
│   │   │   │       └── learn/
│   │   │   │           └── [chapterId]/page.tsx  # Lecteur chapitre + quiz
│   │   │   ├── leaderboard/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── layout.tsx         # Sidebar + header gamifié (XP pill, avatar, streak)
│   │   │
│   │   ├── (trainer)/             # Route group : espace formateur
│   │   │   ├── trainer/
│   │   │   │   ├── dashboard/page.tsx      # Stats de ses cours
│   │   │   │   ├── courses/
│   │   │   │   │   ├── page.tsx            # Liste de ses cours
│   │   │   │   │   ├── new/page.tsx        # Création de cours
│   │   │   │   │   └── [courseId]/
│   │   │   │   │       └── edit/page.tsx   # Éditeur complet (modules, chapitres, quiz)
│   │   │   │   └── layout.tsx
│   │   │
│   │   ├── (admin)/               # Route group : espace admin
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx      # Stats globales plateforme
│   │   │   │   ├── users/page.tsx          # Gestion utilisateurs + rôles
│   │   │   │   ├── courses/page.tsx        # Gestion tous les cours
│   │   │   │   ├── categories/page.tsx     # CRUD catégories de formation
│   │   │   │   ├── badges/page.tsx         # CRUD badges
│   │   │   │   ├── xp/page.tsx             # Ajustement XP manuel
│   │   │   │   └── layout.tsx
│   │   │
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx             # Root layout (fonts, metadata, providers)
│   │   ├── page.tsx               # Landing page publique
│   │   └── globals.css            # Tailwind v4 + design tokens
│   │
│   ├── components/
│   │   ├── ui/                    # Composants shadcn/ui (Button, Card, Dialog, etc.)
│   │   ├── auth/                  # LoginForm, RegisterForm, GoogleButton
│   │   ├── course/                # CourseCard, ChapterViewer, VideoEmbed, CategoryFilter
│   │   ├── quiz/                  # QuizPlayer, QuestionCard, ResultScreen
│   │   ├── dashboard/             # StatsCards, ProgressChart, Calendar
│   │   ├── gamification/          # XPBar, BadgeCard, StreakCounter, LevelBadge, Leaderboard
│   │   ├── editor/                # RichTextEditor (Tiptap), CourseBuilder
│   │   └── layout/                # Sidebar, Header, MobileNav
│   │
│   ├── lib/
│   │   ├── auth.ts                # Configuration NextAuth v5
│   │   ├── db.ts                  # Singleton PrismaClient
│   │   ├── gamification.ts        # Logique XP, badges auto, streaks, niveaux
│   │   ├── utils.ts               # cn(), formatDate(), slugify(), etc.
│   │   └── validations/           # Schémas Zod par domaine
│   │       ├── auth.ts
│   │       ├── course.ts
│   │       ├── category.ts
│   │       └── quiz.ts
│   │
│   ├── hooks/                     # Hooks React personnalisés
│   │   ├── use-current-user.ts
│   │   ├── use-xp.ts
│   │   └── use-course-progress.ts
│   │
│   ├── actions/                   # Server Actions Next.js
│   │   ├── auth.ts
│   │   ├── courses.ts
│   │   ├── quiz.ts
│   │   ├── gamification.ts
│   │   └── admin.ts
│   │
│   ├── middleware.ts              # Protection des routes par rôle
│   │
│   └── types/
│       └── index.ts               # Types TypeScript partagés
│
├── public/
│   ├── badges/                    # Icônes de badges (SVG)
│   └── images/                    # Images statiques
├── src/img/
│   └── logo_akaa.png              # Logo Akaa (bleu #0F63FF)
│
├── .env.local                     # Variables d'environnement (NON COMMITÉ)
├── .cursor/
│   └── rules/
│       ├── stack.mdc              # Conventions techniques
│       └── ux.mdc                 # Règles UX et gamification
│
├── ARCHITECTURE.md                # Ce document
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
└── package-lock.json
```

---

## 5. Rôles et permissions

### Matrice d'accès

| Action | Apprenant | Formateur | Admin |
|--------|:---------:|:---------:|:-----:|
| Voir les cours publiés | Oui | Oui | Oui |
| S'inscrire à un cours | Oui | Oui | Oui |
| Suivre chapitres + quiz | Oui | Oui | Oui |
| Gagner XP / badges | Oui | Oui | Oui |
| Voir le leaderboard | Oui | Oui | Oui |
| Créer/éditer **ses** cours | Non | Oui | Oui |
| Voir les stats de **ses** cours | Non | Oui | Oui |
| Gérer **tous** les cours | Non | Non | Oui |
| Gérer les utilisateurs | Non | Non | Oui |
| CRUD catégories | Non | Non | Oui |
| CRUD badges | Non | Non | Oui |
| Ajuster XP manuellement | Non | Non | Oui |

### Implémentation technique

- **middleware.ts** : vérifie le rôle via la session NextAuth et redirige si non autorisé
- Routes `(platform)/*` : accessible à tous les rôles authentifiés
- Routes `(trainer)/*` : TRAINER et ADMIN uniquement
- Routes `(admin)/*` : ADMIN uniquement
- Server Actions : double vérification du rôle côté serveur avant toute mutation

---

## 6. Plan d'implémentation

### Phase 1 - Fondations (infrastructure et BDD)

- Créer le compte Neon et la base de données `akaa`
- Configurer `prisma/schema.prisma` avec les 15 modèles
- Exécuter `prisma migrate dev` pour générer les tables
- Configurer NextAuth v5 (Google + Credentials) dans `src/lib/auth.ts`
- Créer le singleton PrismaClient dans `src/lib/db.ts`
- Créer `src/middleware.ts` pour la protection des routes
- Configurer `.env.local`

### Phase 2 - Authentification et Layouts

- Pages login/register avec formulaires (Zod validation)
- Bouton Google OAuth
- Root layout avec providers (SessionProvider, QueryClientProvider)
- Layout `(auth)` : centré, minimal
- Layout `(platform)` : sidebar + header avec XP pill et avatar
- Layout `(trainer)` : sidebar formateur
- Layout `(admin)` : sidebar admin
- Composants Sidebar, Header, MobileNav

### Phase 3 - Contenu pédagogique

- **Formateur** : CRUD cours (titre, description, catégorie, thumbnail)
- **Formateur** : Gestion modules (drag & drop pour réordonner)
- **Formateur** : Éditeur de chapitre avec Tiptap (texte riche) + embed vidéo
- **Apprenant** : Catalogue de cours filtrable par catégorie
- **Apprenant** : Page détail cours (modules, chapitres, progression)
- **Apprenant** : Lecteur de chapitre (contenu + vidéo)

### Phase 4 - Quiz et Progression

- **Formateur** : Création de quiz QCM par chapitre
- **Apprenant** : Interface de quiz (QuizPlayer)
- Système de notation et passage
- Tracking ChapterProgress (status, timestamps)
- Calcul et cache du pourcentage de progression par cours (Enrollment.progress_percent)

### Phase 5 - Gamification

- Moteur XP : création de XpTransaction à chaque événement
- Mise à jour du cache `user.total_xp` et `user.level`
- Système de badges automatiques (vérification après chaque action)
- Système de streaks (mise à jour quotidienne)
- Leaderboard (classement par total_xp)
- Animations : notification XP, badge unlock, level up

### Phase 6 - Administration

- Dashboard admin : stats globales (utilisateurs, cours, XP distribués)
- Gestion utilisateurs : liste, changement de rôle, désactivation
- CRUD catégories : nom, couleur, icône, ordre, activation
- CRUD badges : création, conditions, activation
- Ajustement XP manuel : recherche utilisateur + saisie montant/raison

### Phase 7 - UI, Polish et Production

- Intégration UI complète (design system, composants, pages)
- Landing page publique engageante
- Responsive mobile complet
- Animations Framer Motion sur l'ensemble de l'app
- SEO (metadata, Open Graph)
- Seed data : admin, catégories, badges, cours démo
- Tests de performance avec Neon (cold start, requêtes)
- Dark mode (optionnel, si temps disponible)
- Déploiement Railway
