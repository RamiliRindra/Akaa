# Akaa - Architecture Plateforme E-Learning Gamifiée

> Document de référence pour l'architecture technique du projet Akaa.
> Dernière mise à jour : 4 avril 2026

---

## 1. Vision produit

Akaa est une plateforme e-learning gamifiée destinée à ~300 utilisateurs, avec trois rôles distincts (Apprenant, Formateur, Admin). L'expérience d'apprentissage repose sur un système de progression engageant pour les **apprenants** (XP, badges, streaks, leaderboard) et un contenu structuré en **Cours > Modules > Chapitres > Quiz**.

### Contraintes clés

- Plateforme gratuite (pas de monétisation)
- Contenu : texte riche Markdown-first (éditeur MDXEditor cible) + vidéos embarquées (YouTube / Google Drive)
- Création de contenu : saisie manuelle via éditeur Markdown riche ou import massif via package ZIP structuré
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

Le schéma est organisé en **7 domaines** :

1. **Authentification** : User, Account, Session, VerificationToken (tables NextAuth)
2. **Contenu pédagogique** : Category, Course, Module, Chapter
3. **Évaluation** : Quiz, QuizQuestion, QuizOption, QuizAttempt
4. **Progression** : Enrollment, ChapterProgress
5. **Gamification** : XpTransaction, Badge, UserBadge, Streak
6. **Planification** : TrainingProgram, TrainingSession, SessionEnrollment, SessionAttendance
7. **Notifications** : Notification

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
| is_active | BOOLEAN | NOT NULL, default true | Permet la désactivation d’un compte sans suppression |
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
| level | ENUM('BEGINNER','INTERMEDIATE','ADVANCED') | NOT NULL, default 'BEGINNER' | Niveau pédagogique du cours, utilisé pour moduler l’XP apprenant |
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
| content | JSONB | nullable | Contenu riche actuel ; migration prévue vers Markdown canonique avant import massif |
| video_url | TEXT | nullable | URL YouTube ou Google Drive |
| video_type | ENUM('YOUTUBE','GDRIVE','NONE') | NOT NULL, default 'NONE' | |
| order | INTEGER | NOT NULL | Ordre dans le module |
| estimated_minutes | INTEGER | nullable | |
| module_id | UUID | FK -> Module(id) ON DELETE CASCADE | **INDEX** |

> **Décision d'architecture** : avant l'import massif, l'éditeur manuel bascule vers **MDXEditor**
> avec une approche **Markdown-first**. Le Markdown devient le format canonique de travail
> pour la saisie manuelle, les templates et l'import/export.
>
> **Transition prévue** : l'implémentation actuelle peut encore stocker du JSON riche pendant
> la migration, mais l'import massif ne doit pas être construit tant que cette bascule
> MDXEditor/Markdown n'est pas terminée.
>
> **Markdown supporté v1** : sous-ensemble officiel uniquement
> (titres, paragraphes, listes, blockquotes, liens, séparateurs, code inline, blocs de code).
> Les vidéos importées restent limitées à YouTube / Google Drive.

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
>
> **Périmètre rôle** : ce système d’XP apprenant ne s’applique qu’aux utilisateurs `LEARNER`.
> Les rôles `TRAINER` et `ADMIN` n’accumulent pas d’XP, de badges ou de streaks apprenants.

**XpLevelSetting** - Coefficients XP globaux par niveau de cours, gérés par l'admin

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| level | ENUM('BEGINNER','INTERMEDIATE','ADVANCED') | UNIQUE, NOT NULL | Niveau pédagogique du cours |
| multiplier | DECIMAL(5,2) | NOT NULL | Coefficient appliqué aux gains XP apprenant liés au cours |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

> Cette table centralise la configuration admin des multiplicateurs XP par niveau de cours.
> Le formateur choisit le niveau du cours ; l’admin règle les coefficients.

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

---

#### DOMAINE : Planification (Calendrier de formation)

> Ce domaine gère les sessions de formation planifiées (présentiel et/ou distanciel),
> les parcours de formation (programmes regroupant plusieurs sessions), l'inscription
> avec workflow d'approbation par le formateur, et l'émargement (feuille de présence).
> L'UX s'inspire de Google Calendar / Apple Calendar pour la vue agenda.

**TrainingProgram** - Parcours de formation (série de sessions planifiées)

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | Généré depuis title |
| description | TEXT | nullable | |
| trainer_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Formateur créateur |
| status | ENUM('DRAFT','PUBLISHED','ARCHIVED') | NOT NULL, default 'DRAFT' | |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

> Un parcours regroupe plusieurs TrainingSessions dans un ordre logique.
> Similaire aux "Learning Paths" de LinkedIn Learning.

**TrainingSession** - Session de formation (événement calendrier)

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | nullable | |
| start_at | TIMESTAMP | NOT NULL | Début de la session |
| end_at | TIMESTAMP | NOT NULL | Fin de la session |
| is_all_day | BOOLEAN | NOT NULL, default false | Événement "toute la journée" |
| location | TEXT | nullable | Adresse physique ou lien de visio |
| max_participants | INTEGER | nullable | null = illimité |
| xp_reward | INTEGER | NOT NULL, default 0 | XP attribués sur présence confirmée (configurable par formateur) |
| trainer_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Formateur organisateur |
| course_id | UUID | FK -> Course(id) ON DELETE SET NULL, nullable | **INDEX** - Lien optionnel vers un cours en ligne |
| program_id | UUID | FK -> TrainingProgram(id) ON DELETE SET NULL, nullable | **INDEX** - Rattachement optionnel à un parcours |
| program_order | INTEGER | nullable | Ordre dans le parcours (si rattaché) |
| status | ENUM('SCHEDULED','CANCELLED','COMPLETED') | NOT NULL, default 'SCHEDULED' | |
| recurrence_rule | VARCHAR(255) | nullable | Format RRULE (RFC 5545) pour les sessions récurrentes |
| recurrence_parent_id | UUID | FK -> TrainingSession(id) ON DELETE SET NULL, nullable | Réf. vers la session parente récurrente |
| reminder_minutes | JSONB | NOT NULL, default '[1440, 60]' | Minutes avant la session pour rappels (ex: [1440, 60] = 24h et 1h avant) |
| created_at | TIMESTAMP | NOT NULL, default now() | |
| updated_at | TIMESTAMP | NOT NULL, default now() | |

> **Récurrence** : le formateur définit une règle RRULE (ex: "tous les mardis pendant 4 semaines").
> À la création, le système génère les instances individuelles. Chaque instance référence
> la session parente via `recurrence_parent_id`. Modifier la parente peut propager aux enfants.
>
> **Lien cours** : `course_id` est optionnel. Le formateur peut créer une session standalone
> ou la rattacher à un cours en ligne existant. L'inscription à la session (`SessionEnrollment`)
> est indépendante de l'inscription au cours (`Enrollment`).

**SessionEnrollment** - Inscription à une session avec workflow d'approbation

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Apprenant demandeur |
| session_id | UUID | FK -> TrainingSession(id) ON DELETE CASCADE | **INDEX** - Session ciblée |
| status | ENUM('PENDING','APPROVED','REJECTED','CANCELLED') | NOT NULL, default 'PENDING' | |
| requested_at | TIMESTAMP | NOT NULL, default now() | Date de la demande |
| responded_at | TIMESTAMP | nullable | Date de réponse du formateur |
| responded_by | UUID | FK -> User(id) ON DELETE SET NULL, nullable | Formateur/admin ayant répondu |

> **UNIQUE(user_id, session_id)** - Un apprenant ne peut faire qu'une demande par session.
> INDEX composite sur (user_id, session_id).
>
> **Workflow** :
> 1. L'apprenant clique "S'inscrire" → status = PENDING
> 2. Le formateur reçoit une notification → approuve (APPROVED) ou refuse (REJECTED)
> 3. L'apprenant reçoit une notification du résultat
> 4. L'apprenant peut annuler (CANCELLED) tant que la session n'a pas eu lieu
>
> **Capacité** : avant de créer un SessionEnrollment, vérifier que le nombre d'inscrits APPROVED
> n'a pas atteint `session.max_participants` (si non null).

**SessionAttendance** - Feuille de présence / Émargement

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Participant |
| session_id | UUID | FK -> TrainingSession(id) ON DELETE CASCADE | **INDEX** - Session |
| status | ENUM('PRESENT','ABSENT','LATE','EXCUSED') | NOT NULL, default 'ABSENT' | |
| marked_at | TIMESTAMP | nullable | Horodatage du pointage |
| marked_by | UUID | FK -> User(id) ON DELETE SET NULL, nullable | Formateur/admin ayant pointé |
| notes | TEXT | nullable | Commentaire optionnel |

> **UNIQUE(user_id, session_id)** - Une seule entrée de présence par participant par session.
> Seuls les participants APPROVED dans SessionEnrollment peuvent avoir une entrée ici.
> Le formateur (ou admin) pointe la présence pendant ou après la session.
> La présence confirmée (PRESENT ou LATE) déclenche l'attribution des XP de la session.

---

#### DOMAINE : Notifications

> Système de notifications in-app pour informer les utilisateurs des événements liés
> au calendrier de formation (approbation/rejet inscription, rappels de session,
> annulation, etc.). Extensible à d'autres domaines dans le futur.

**Notification** - Notifications utilisateur

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK -> User(id) ON DELETE CASCADE | **INDEX** - Destinataire |
| type | ENUM('ENROLLMENT_APPROVED','ENROLLMENT_REJECTED','SESSION_REMINDER','SESSION_CANCELLED','SESSION_UPDATED','XP_EARNED','BADGE_UNLOCKED') | NOT NULL | |
| title | VARCHAR(255) | NOT NULL | Titre court (ex: "Inscription acceptée") |
| message | TEXT | NOT NULL | Corps du message |
| is_read | BOOLEAN | NOT NULL, default false | |
| link | TEXT | nullable | URL de navigation (ex: /calendar/sessions/[id]) |
| related_session_id | UUID | FK -> TrainingSession(id) ON DELETE SET NULL, nullable | Session liée (si applicable) |
| created_at | TIMESTAMP | NOT NULL, default now() | |

> **INDEX** sur (user_id, is_read) pour les requêtes "notifications non lues".
> Les notifications sont affichées via une cloche dans le header (badge compteur non lues).
> Auto-nettoyage possible : supprimer les notifications lues de plus de 30 jours.
>
> **Rappels de session** : un job planifié (cron Railway ou vérification côté client au chargement)
> crée des notifications de type SESSION_REMINDER selon `session.reminder_minutes`.
> Pour ~300 utilisateurs, une vérification au chargement de page est acceptable en MVP.

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

-- Planification (calendrier de formation)
CREATE INDEX idx_training_program_trainer ON training_program(trainer_id);
CREATE INDEX idx_training_session_trainer ON training_session(trainer_id);
CREATE INDEX idx_training_session_course ON training_session(course_id);
CREATE INDEX idx_training_session_program ON training_session(program_id);
CREATE INDEX idx_training_session_start ON training_session(start_at);
CREATE INDEX idx_training_session_status ON training_session(status);
CREATE INDEX idx_training_session_recurrence ON training_session(recurrence_parent_id);
CREATE INDEX idx_session_enrollment_user ON session_enrollment(user_id);
CREATE INDEX idx_session_enrollment_session ON session_enrollment(session_id);
CREATE INDEX idx_session_enrollment_status ON session_enrollment(status);
CREATE INDEX idx_session_attendance_user ON session_attendance(user_id);
CREATE INDEX idx_session_attendance_session ON session_attendance(session_id);

-- Notifications
CREATE INDEX idx_notification_user ON notification(user_id);
CREATE INDEX idx_notification_user_unread ON notification(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notification_session ON notification(related_session_id);
```

### 3.4 Règles de gamification

| Événement | XP gagnés | Source |
|-----------|-----------|--------|
| Compléter un chapitre | +10 XP de base, modulés par le niveau du cours | CHAPTER |
| Réussir un quiz | +50 XP de base (ou `quiz.xp_reward`), modulés par le niveau du cours | QUIZ |
| Quiz score parfait (100%) | +25 XP bonus, modulés par le niveau du cours | QUIZ |
| Maintenir un streak de 7 jours | +30 XP | STREAK |
| Débloquer un badge avec xp_bonus | +xp_bonus du badge | BADGE |
| Présence confirmée à une session | +xp_reward de la session (configurable par formateur) | SESSION |
| Ajustement admin | +/- variable | ADMIN |

> **Source enum** (XpTransaction.source) : `QUIZ | CHAPTER | STREAK | ADMIN | BADGE | SESSION`
>
> **Multiplicateurs de niveau (config admin)** :
> - `BEGINNER` : `1.00` par défaut
> - `INTERMEDIATE` : `1.50` par défaut
> - `ADVANCED` : `2.00` par défaut
>
> Ces multiplicateurs s’appliquent aux gains XP apprenant liés au contenu du cours
> (chapitre terminé, quiz réussi, bonus de quiz parfait).

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
| Présent | 1 session suivie | SESSIONS_ATTENDED = 1 | 15 |
| Régulier | 10 sessions suivies | SESSIONS_ATTENDED = 10 | 40 |

> **Condition type enum** (Badge.condition_type) : `XP_THRESHOLD | COURSES_COMPLETED | STREAK | QUIZ_PERFECT | SESSIONS_ATTENDED | MANUAL`
>
> Les XP des sessions sont configurables par le formateur (champ `training_session.xp_reward`).
> L'admin peut aussi modifier les XP d'une session via l'espace admin.

---

## 4. Structure des dossiers

```
akaa/
├── prisma/
│   ├── schema.prisma              # Schéma complet Prisma (~23 modèles, 7 domaines)
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
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx                # Mon calendrier (sessions inscrites, vue agenda)
│   │   │   │   └── sessions/
│   │   │   │       └── [sessionId]/page.tsx  # Détail session + inscription
│   │   │   ├── programs/
│   │   │   │   ├── page.tsx                # Parcours de formation disponibles
│   │   │   │   └── [programId]/page.tsx    # Détail parcours (liste sessions)
│   │   │   ├── leaderboard/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── layout.tsx         # Sidebar + header gamifié (XP pill, avatar, streak, notif bell)
│   │   │
│   │   ├── (trainer)/             # Route group : espace formateur
│   │   │   ├── trainer/
│   │   │   │   ├── dashboard/page.tsx      # Stats de ses cours
│   │   │   │   ├── courses/
│   │   │   │   │   ├── page.tsx            # Liste de ses cours
│   │   │   │   │   ├── new/page.tsx        # Création de cours
│   │   │   │   │   └── [courseId]/
│   │   │   │   │       └── edit/page.tsx   # Éditeur complet (modules, chapitres, quiz)
│   │   │   │   ├── calendar/
│   │   │   │   │   ├── page.tsx            # Vue calendrier formateur (ses sessions + autres formateurs en lecture)
│   │   │   │   │   └── sessions/
│   │   │   │   │       ├── new/page.tsx    # Création de session
│   │   │   │   │       └── [sessionId]/
│   │   │   │   │           ├── edit/page.tsx      # Édition session
│   │   │   │   │           ├── enrollments/page.tsx  # Gérer demandes d'inscription (approuver/refuser)
│   │   │   │   │           └── attendance/page.tsx   # Feuille de présence / émargement
│   │   │   │   ├── programs/
│   │   │   │   │   ├── page.tsx            # Liste de ses parcours
│   │   │   │   │   ├── new/page.tsx        # Création de parcours
│   │   │   │   │   └── [programId]/
│   │   │   │   │       └── edit/page.tsx   # Édition parcours (ajout/réordonnancement sessions)
│   │   │   │   └── layout.tsx
│   │   │
│   │   ├── (admin)/               # Route group : espace admin
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx      # Stats globales plateforme
│   │   │   │   ├── users/page.tsx          # Gestion utilisateurs + rôles, recherche, filtres, pagination
│   │   │   │   ├── courses/page.tsx        # Gestion tous les cours + accès détail admin
│   │   │   │   │   └── [courseId]/page.tsx # Consultation admin d’un cours sans sortir du périmètre admin
│   │   │   │   ├── categories/page.tsx     # CRUD catégories + picker visuel icône/couleur
│   │   │   │   ├── badges/page.tsx         # CRUD badges
│   │   │   │   ├── xp/page.tsx             # Coefficients XP par niveau + ajustement manuel apprenant
│   │   │   │   ├── calendar/
│   │   │   │   │   ├── page.tsx            # Vue globale toutes les sessions (tous formateurs)
│   │   │   │   │   └── sessions/
│   │   │   │   │       └── [sessionId]/page.tsx  # Détail + édition session (accès total)
│   │   │   │   ├── programs/page.tsx       # Vue globale tous les parcours
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
│   │   ├── calendar/              # CalendarView, SessionCard, SessionDetail, SessionForm
│   │   ├── program/               # ProgramCard, ProgramDetail, ProgramForm
│   │   ├── attendance/            # AttendanceSheet, AttendanceRow, AttendanceStatus
│   │   ├── notifications/         # NotificationBell, NotificationList, NotificationItem
│   │   ├── editor/                # MarkdownEditor (MDXEditor), CourseBuilder
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
│   │       ├── quiz.ts
│   │       ├── session.ts          # createSessionSchema, updateSessionSchema
│   │       └── program.ts          # createProgramSchema, updateProgramSchema
│   │
│   ├── hooks/                     # Hooks React personnalisés
│   │   ├── use-current-user.ts
│   │   ├── use-xp.ts
│   │   ├── use-course-progress.ts
│   │   ├── use-calendar.ts         # Sessions à venir, filtrage par date
│   │   └── use-notifications.ts    # Notifications non lues, polling
│   │
│   ├── actions/                   # Server Actions Next.js
│   │   ├── auth.ts
│   │   ├── courses.ts
│   │   ├── quiz.ts
│   │   ├── gamification.ts
│   │   ├── sessions.ts             # CRUD sessions, inscription, émargement
│   │   ├── programs.ts             # CRUD parcours de formation
│   │   ├── notifications.ts        # Fetch, mark read, delete notifications
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

> **Extension phase 3** : ajouter une page dédiée à l'import massif côté formateur,
> typiquement `src/app/(trainer)/trainer/courses/import/page.tsx`, sans remplacer le CRUD manuel existant.

---

## 5. Rôles et permissions

### Matrice d'accès

| Action | Apprenant | Formateur | Admin |
|--------|:---------:|:---------:|:-----:|
| Voir les cours publiés | Oui | Oui | Oui |
| S'inscrire à un cours | Oui | Oui | Oui |
| Suivre chapitres + quiz | Oui | Oui | Oui |
| Gagner XP / badges apprenant | Oui | Non | Non |
| Voir le leaderboard apprenant | Oui | Non | Non |
| Créer/éditer **ses** cours | Non | Oui | Oui |
| Voir les stats de **ses** cours | Non | Oui | Oui |
| Gérer **tous** les cours | Non | Non | Oui |
| Gérer les utilisateurs | Non | Non | Oui |
| CRUD catégories | Non | Non | Oui |
| CRUD badges | Non | Non | Oui |
| Ajuster XP manuellement | Non | Non | Oui |
| **— Calendrier de formation —** | | | |
| Voir son calendrier (sessions inscrites) | Oui | Oui | Oui |
| Voir les sessions/parcours disponibles | Oui | Oui | Oui |
| Demander inscription à une session | Oui | Oui | Oui |
| Annuler sa propre inscription | Oui | Oui | Oui |
| Créer/éditer **ses** sessions | Non | Oui | Oui |
| Créer/éditer **ses** parcours | Non | Oui | Oui |
| Approuver/refuser les inscriptions à **ses** sessions | Non | Oui | Oui |
| Pointer la présence (émargement) sur **ses** sessions | Non | Oui | Oui |
| Voir les sessions des autres formateurs (lecture) | Non | Oui | Oui |
| Configurer XP des **ses** sessions | Non | Oui | Oui |
| Régler les coefficients XP par niveau de cours | Non | Non | Oui |
| Gérer **toutes** les sessions/parcours | Non | Non | Oui |
| Modifier XP des sessions de tout formateur | Non | Non | Oui |
| Vue globale calendrier (tous formateurs) | Non | Non | Oui |

### Implémentation technique

- **middleware.ts** : vérifie le rôle via la session NextAuth et redirige si non autorisé
- Routes `(platform)/*` : accessible à tous les rôles authentifiés (dont `/calendar`, `/programs`)
- Routes `(trainer)/*` : TRAINER et ADMIN uniquement (dont `/trainer/calendar`, `/trainer/programs`)
- Routes `(admin)/*` : ADMIN uniquement (dont `/admin/calendar`, `/admin/programs`)
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
- **Formateur** : Gestion modules (réordonnancement fonctionnel ; drag & drop optionnel en amélioration)
- **Formateur** : Bascule éditeur manuel vers **MDXEditor** avec stratégie **Markdown-first**
- **Formateur** : Définition du sous-ensemble Markdown officiel v1 (dont `code inline` et blocs de code)
- **Formateur** : Import massif d'un cours via ZIP unique (`manifest.csv` + `chapters/*.md`) **après** la bascule MDXEditor
- **Formateur** : Prévalidation d'import avant écriture en base + téléchargement de modèles CSV/Markdown
- **Apprenant** : Catalogue de cours filtrable par catégorie
- **Apprenant** : Page détail cours (modules, chapitres, progression)
- **Apprenant** : Lecteur de chapitre (contenu + vidéo)

> **Ordre d'implémentation verrouillé** : migration éditeur vers MDXEditor d'abord, import massif ensuite.
>
> **Contrat d'import v1** : un import = un cours. Le ZIP contient un `manifest.csv` pour la
> structure (cours, modules, chapitres, ordres, métadonnées) et des fichiers Markdown pour
> le contenu détaillé des chapitres. Le CRUD manuel Markdown-first reste disponible et
> constitue la voie standard de secours.

### Phase 4 - Quiz et Progression

- **Formateur** : Création de quiz QCM par chapitre
- **Apprenant** : Interface de quiz (QuizPlayer)
- Système de notation et passage
- Tracking ChapterProgress (status, timestamps)
- Calcul et cache du pourcentage de progression par cours (Enrollment.progress_percent)

### Phase 5 - Gamification

- Moteur XP : création de XpTransaction à chaque événement apprenant
- Mise à jour du cache `user.total_xp` et `user.level`
- Système de badges automatiques (vérification après chaque action)
- Système de streaks (mise à jour quotidienne)
- Leaderboard apprenant (classement des `LEARNER` par total_xp)
- Restriction de la gamification apprenante au rôle `LEARNER`
- Ajout du niveau de cours (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
- Ajout des coefficients XP globaux par niveau, pilotés par l’admin
- Animations : notification XP, badge unlock, level up

### Phase 6 - Administration

- Dashboard admin : stats globales (utilisateurs, cours, XP distribués)
- Gestion utilisateurs : liste, recherche, filtres, pagination, changement de rôle, désactivation
- CRUD catégories : nom, couleur, icône, ordre, activation, avec picker visuel
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

### Phase 8 - Calendrier de formation (post-MVP)

> Cette phase ajoute la dimension **formation planifiée** (présentiel/distanciel) à la plateforme,
> avec un système de calendrier inspiré de Google Calendar et des parcours de formation
> inspirés de LinkedIn Learning.

#### 8.1 — Modèles et migrations

- Ajouter les modèles Prisma : `TrainingProgram`, `TrainingSession`, `SessionEnrollment`, `SessionAttendance`, `Notification`
- Étendre les enums : `XpSource` += `SESSION`, `BadgeConditionType` += `SESSIONS_ATTENDED`, `NotificationType`
- Créer la migration Prisma et l'appliquer
- Seed : parcours de démonstration, sessions exemple, badges "Présent" et "Régulier"

#### 8.2 — Sessions de formation (formateur)

- **CRUD sessions** : création avec date/heure/durée, événement toute la journée, lieu/lien, description
- **Lien cours optionnel** : le formateur peut rattacher une session à un cours en ligne existant ou créer une session standalone
- **Récurrence** : création de sessions récurrentes (RRULE RFC 5545), génération des instances individuelles
- **Gestion des inscriptions** : vue des demandes PENDING, boutons approuver/refuser, notification automatique à l'apprenant
- **Feuille de présence** : interface d'émargement (liste des participants APPROVED, pointage PRESENT/ABSENT/LATE/EXCUSED)
- **Configuration XP** : champ `xp_reward` configurable par le formateur sur chaque session
- **Vue calendrier** : le formateur voit ses sessions + celles des autres formateurs (lecture seule)

#### 8.3 — Parcours de formation (formateur)

- **CRUD parcours** : titre, description, statut (DRAFT/PUBLISHED/ARCHIVED)
- **Gestion des sessions** : ajout/retrait de sessions dans un parcours, réordonnancement
- **Vue parcours** : liste ordonnée des sessions avec statuts et dates

#### 8.4 — Calendrier apprenant

- **Mon calendrier** : vue agenda/liste chronologique des sessions auxquelles l'apprenant est inscrit (APPROVED)
- **Affichage** : cases de calendrier style agenda (pas de vue mensuelle complète, liste chronologique avec regroupement par jour/semaine)
- **Parcourir les sessions** : catalogue des sessions disponibles (SCHEDULED) avec inscription
- **Demande d'inscription** : bouton "S'inscrire" → status PENDING → notification au formateur
- **Annulation** : possibilité de se désinscrire tant que la session n'a pas eu lieu
- **Parcours** : consultation des parcours publiés, vue du programme complet

#### 8.5 — Notifications in-app

- **Notification bell** : icône cloche dans le header avec badge compteur (notifications non lues)
- **Types** : inscription approuvée/refusée, rappel de session, session annulée/modifiée, XP gagnés, badge débloqué
- **Rappels** : notifications automatiques avant chaque session (configurable via `reminder_minutes` : 24h et 1h avant par défaut)
- **Stratégie de rappels** : vérification côté serveur au chargement de page (acceptable pour ~300 utilisateurs) ou cron Railway
- **Liste** : page/panel de notifications avec marquage lu/non lu, lien direct vers la session concernée

#### 8.6 — Gamification sessions

- **XP sur présence** : attribution automatique de `session.xp_reward` XP quand le formateur marque PRESENT ou LATE
- **Création XpTransaction** avec source = `SESSION` et `source_id` = `session.id`
- **Badges** : vérification automatique des badges `SESSIONS_ATTENDED` après chaque pointage de présence
- **Toast XP** : réutilisation de l'animation XP existante quand l'apprenant consulte son calendrier/notifications

#### 8.7 — Administration calendrier

- **Vue globale** : l'admin voit toutes les sessions de tous les formateurs
- **Édition** : l'admin peut créer/modifier/supprimer n'importe quelle session ou parcours
- **XP** : l'admin peut modifier le `xp_reward` de n'importe quelle session
- **Statistiques** : nombre de sessions, taux de participation, présences par formateur
