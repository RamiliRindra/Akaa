-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'TRAINER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('YOUTUBE', 'GDRIVE', 'NONE');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "ChapterProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('QUIZ', 'CHAPTER', 'STREAK', 'ADMIN', 'BADGE');

-- CreateEnum
CREATE TYPE "BadgeConditionType" AS ENUM ('XP_THRESHOLD', 'COURSES_COMPLETED', 'STREAK', 'QUIZ_PERFECT', 'MANUAL');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "image" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "email_verified" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'BookOpen',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "trainer_id" UUID NOT NULL,
    "category_id" UUID,
    "estimated_hours" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "course_id" UUID NOT NULL,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" JSONB,
    "video_url" TEXT,
    "video_type" "VideoType" NOT NULL DEFAULT 'NONE',
    "order" INTEGER NOT NULL,
    "estimated_minutes" INTEGER,
    "module_id" UUID NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "passing_score" INTEGER NOT NULL DEFAULT 70,
    "xp_reward" INTEGER NOT NULL DEFAULT 50,
    "chapter_id" UUID NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'SINGLE',
    "order" INTEGER NOT NULL,
    "quiz_id" UUID NOT NULL,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_option" (
    "id" UUID NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "question_id" UUID NOT NULL,

    CONSTRAINT "quiz_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quiz_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "attempted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),
    "progress_percent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "status" "ChapterProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transaction" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "source_id" VARCHAR(255),
    "description" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT NOT NULL,
    "condition_type" "BadgeConditionType" NOT NULL,
    "condition_value" INTEGER,
    "xp_bonus" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badge" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,

    CONSTRAINT "user_badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" DATE,

    CONSTRAINT "streak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_total_xp_desc" ON "user"("total_xp" DESC);

-- CreateIndex
CREATE INDEX "idx_account_user_id" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_account_provider_provider_account" ON "account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_session_token_key" ON "session"("session_token");

-- CreateIndex
CREATE INDEX "idx_session_user_id" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_verification_token_token" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "uq_verification_token_identifier_token" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "course_slug_key" ON "course"("slug");

-- CreateIndex
CREATE INDEX "idx_course_trainer_id" ON "course"("trainer_id");

-- CreateIndex
CREATE INDEX "idx_course_category_id" ON "course"("category_id");

-- CreateIndex
CREATE INDEX "idx_course_status" ON "course"("status");

-- CreateIndex
CREATE INDEX "idx_module_course_id" ON "module"("course_id");

-- CreateIndex
CREATE INDEX "idx_chapter_module_id" ON "chapter"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_chapter_id_key" ON "quiz"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_quiz_chapter_id" ON "quiz"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_quiz_question_quiz_id" ON "quiz_question"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_quiz_option_question_id" ON "quiz_option"("question_id");

-- CreateIndex
CREATE INDEX "idx_quiz_attempt_user_id" ON "quiz_attempt"("user_id");

-- CreateIndex
CREATE INDEX "idx_quiz_attempt_quiz_id" ON "quiz_attempt"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_enrollment_user_id" ON "enrollment"("user_id");

-- CreateIndex
CREATE INDEX "idx_enrollment_course_id" ON "enrollment"("course_id");

-- CreateIndex
CREATE INDEX "idx_enrollment_user_course" ON "enrollment"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_enrollment_user_course" ON "enrollment"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_chapter_progress_user_id" ON "chapter_progress"("user_id");

-- CreateIndex
CREATE INDEX "idx_chapter_progress_chapter_id" ON "chapter_progress"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_chapter_progress_user_chapter" ON "chapter_progress"("user_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chapter_progress_user_chapter" ON "chapter_progress"("user_id", "chapter_id");

-- CreateIndex
CREATE INDEX "idx_xp_transaction_user_id" ON "xp_transaction"("user_id");

-- CreateIndex
CREATE INDEX "idx_xp_transaction_created_at_desc" ON "xp_transaction"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "badge_name_key" ON "badge"("name");

-- CreateIndex
CREATE INDEX "idx_user_badge_user_id" ON "user_badge"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_badge_badge_id" ON "user_badge"("badge_id");

-- CreateIndex
CREATE INDEX "idx_user_badge_granted_by" ON "user_badge"("granted_by");

-- CreateIndex
CREATE INDEX "idx_user_badge_user_badge" ON "user_badge"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_badge_user_badge" ON "user_badge"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "streak_user_id_key" ON "streak"("user_id");

-- CreateIndex
CREATE INDEX "idx_streak_user_id" ON "streak"("user_id");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_option" ADD CONSTRAINT "quiz_option_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transaction" ADD CONSTRAINT "xp_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak" ADD CONSTRAINT "streak_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

