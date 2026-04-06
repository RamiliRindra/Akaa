-- Ajoute le regroupement des occurrences générées depuis une même RRULE.
ALTER TABLE "training_session" ADD COLUMN IF NOT EXISTS "recurrence_series_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_training_session_recurrence_series_id" ON "training_session" ("recurrence_series_id");
