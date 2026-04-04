-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "course"
ADD COLUMN "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER';

-- CreateTable
CREATE TABLE "xp_level_setting" (
    "id" UUID NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "multiplier" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "xp_level_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_level_setting_level_key" ON "xp_level_setting"("level");

-- Seed defaults
INSERT INTO "xp_level_setting" ("id", "level", "multiplier", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'BEGINNER', 1.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'INTERMEDIATE', 1.50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ADVANCED', 2.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
