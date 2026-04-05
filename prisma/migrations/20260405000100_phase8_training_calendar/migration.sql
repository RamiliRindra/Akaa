-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE IF NOT EXISTS 'SESSION';

-- AlterEnum
ALTER TYPE "BadgeConditionType" ADD VALUE IF NOT EXISTS 'SESSIONS_ATTENDED';

DO $$
BEGIN
  CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SessionAccessPolicy" AS ENUM ('OPEN', 'SESSION_ONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SessionEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'SESSION_REQUEST',
    'SESSION_APPROVED',
    'SESSION_REJECTED',
    'SESSION_CANCELLED',
    'SESSION_REMINDER',
    'XP_GAINED',
    'BADGE_UNLOCKED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "training_program" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "trainer_id" UUID NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "training_program_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "training_program_trainer_id_fkey"
    FOREIGN KEY ("trainer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "program_course" (
  "id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "program_course_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "program_course_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "training_program"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "program_course_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "uq_program_course_program_course" UNIQUE ("program_id", "course_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "training_session" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "access_policy" "SessionAccessPolicy" NOT NULL DEFAULT 'OPEN',
  "starts_at" TIMESTAMP(6) NOT NULL,
  "ends_at" TIMESTAMP(6) NOT NULL,
  "is_all_day" BOOLEAN NOT NULL DEFAULT false,
  "location" VARCHAR(255),
  "meeting_url" TEXT,
  "recurrence_rule" TEXT,
  "reminder_minutes" INTEGER NOT NULL DEFAULT 1440,
  "xp_reward" INTEGER NOT NULL DEFAULT 30,
  "trainer_id" UUID NOT NULL,
  "course_id" UUID,
  "program_id" UUID,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "training_session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "training_session_trainer_id_fkey"
    FOREIGN KEY ("trainer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "training_session_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "training_session_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "training_program"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "chk_training_session_single_target"
    CHECK (
      (CASE WHEN "course_id" IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN "program_id" IS NULL THEN 0 ELSE 1 END) = 1
    )
);

ALTER TABLE "training_session"
  ADD COLUMN IF NOT EXISTS "access_policy" "SessionAccessPolicy" NOT NULL DEFAULT 'OPEN';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_training_session_single_target'
      AND conrelid = 'training_session'::regclass
  ) THEN
    ALTER TABLE "training_session"
      ADD CONSTRAINT "chk_training_session_single_target"
      CHECK (
        (CASE WHEN "course_id" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "program_id" IS NULL THEN 0 ELSE 1 END) = 1
      ) NOT VALID;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "session_enrollment" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "status" "SessionEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "session_enrollment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_enrollment_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_enrollment_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "uq_session_enrollment_user_session" UNIQUE ("user_id", "session_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "session_attendance" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  "marked_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "marked_by" UUID,

  CONSTRAINT "session_attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_attendance_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_attendance_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_attendance_marked_by_fkey"
    FOREIGN KEY ("marked_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "uq_session_attendance_user_session" UNIQUE ("user_id", "session_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "related_url" TEXT,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "training_program_slug_key" ON "training_program"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_program_trainer_id" ON "training_program"("trainer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_program_status" ON "training_program"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_program_course_program_id" ON "program_course"("program_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_program_course_course_id" ON "program_course"("course_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_program_course_program_order" ON "program_course"("program_id", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_session_trainer_id" ON "training_session"("trainer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_session_course_id" ON "training_session"("course_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_session_program_id" ON "training_session"("program_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_session_status" ON "training_session"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_training_session_starts_at" ON "training_session"("starts_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_enrollment_user_id" ON "session_enrollment"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_enrollment_session_id" ON "session_enrollment"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_enrollment_status" ON "session_enrollment"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_attendance_user_id" ON "session_attendance"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_attendance_session_id" ON "session_attendance"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_session_attendance_marked_by" ON "session_attendance"("marked_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_notification_user_id" ON "notification"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_notification_is_read" ON "notification"("is_read");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_notification_created_at_desc" ON "notification"("created_at" DESC);
