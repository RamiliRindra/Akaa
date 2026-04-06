-- Avis utilisateurs (cours + plateforme)
CREATE TYPE "FeedbackKind" AS ENUM ('LEARNER_COURSE', 'LEARNER_PLATFORM', 'TRAINER_AUTHORING', 'TRAINER_PLATFORM');

CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "FeedbackKind" NOT NULL,
    "course_id" UUID,
    "target_key" VARCHAR(96) NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_feedback_user_target" ON "feedback"("user_id", "target_key");
CREATE INDEX "idx_feedback_user_id" ON "feedback"("user_id");
CREATE INDEX "idx_feedback_kind" ON "feedback"("kind");
CREATE INDEX "idx_feedback_course_id" ON "feedback"("course_id");

ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
