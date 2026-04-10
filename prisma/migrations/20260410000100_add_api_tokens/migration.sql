-- Phase 9 — API IA programmatique
-- Ajoute deux colonnes nullable sur `user` pour stocker le jeton API IA
-- (`akaa_<random>`) utilisé par /api/v1/* et le serveur MCP.

ALTER TABLE "user"
  ADD COLUMN "api_token" VARCHAR(64),
  ADD COLUMN "api_token_created_at" TIMESTAMP(6);

-- Contrainte d'unicité : un même jeton ne peut jamais être partagé entre deux comptes.
CREATE UNIQUE INDEX "user_api_token_key" ON "user"("api_token");

-- Index explicite pour accélérer le lookup par jeton lors de l'authentification
-- des requêtes /api/v1/*.
CREATE INDEX "idx_user_api_token" ON "user"("api_token");
