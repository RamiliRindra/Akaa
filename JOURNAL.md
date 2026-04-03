# 🔧 PROBLÈME RÉSEAU — Port 5432 bloqué par TGN Madagascar

**Date de résolution :** 02 Avril 2026  
**Projet :** Akaa  
**Stack :** Prisma ORM + Neon DB (PostgreSQL) + Node.js  

---

## 📋 Contexte

Lors de l'exécution de `npx prisma migrate dev`, l'erreur suivante apparaît systématiquement :
Error: P1001: Can't reach database server at
ep-crimson-violet-ag7bzsbj.c-2.eu-central-1.aws.neon.tech:5432

---

## 🔍 Diagnostic effectué

### Étape 1 — Vérification DNS (OK)
```bash
nslookup ep-crimson-violet-ag7bzsbj.c-2.eu-central-1.aws.neon.tech
```
**Résultat :** Le hostname se résout correctement en IPs AWS (`3.69.34.233`, `63.178.215.242`, `63.179.28.86`). DNS = OK.

### Étape 2 — Test connexion TCP port 5432 (FAIL)
```bash
nc -zv -w5 3.69.34.233 5432
# nc: connectx to 3.69.34.233 port 5432 (tcp) failed: Operation timed out
```

### Étape 3 — Test connexion TCP port 6543 pooler (FAIL)
```bash
nc -zv ep-crimson-violet-ag7bzsbj-pooler.c-2.eu-central-1.aws.neon.tech 6543
# nc: connectx ... port 6543 (tcp) failed: Operation timed out
```

### Étape 4 — Traceroute (CONFIRMATION)
```bash
traceroute -p 5432 ep-crimson-violet-ag7bzsbj.c-2.eu-central-1.aws.neon.tech
```
**Résultat :**
1 192.168.88.1 → routeur local
2 tgn.17.56.1.tgn.mg → FAI TGN Madagascar
3-6 réseau interne TGN
7-16 * * * → paquets droppés ici


### Conclusion
**Le FAI TGN Madagascar bloque les ports 5432 et 6543 au niveau de son infrastructure réseau.** Ce n'est pas un problème Neon, ni Prisma, ni de configuration locale.

- Neon Settings : "Allow traffic via the public internet" = ✅ activé
- Connexion via SQL Editor Neon (HTTPS port 443) = ✅ fonctionne
- Connexion TCP directe port 5432/6543 = ❌ bloqué par TGN

---

## ✅ Solution appliquée — Workflow migration manuel via SQL Editor Neon

### Étape 1 — Générer le SQL localement (sans connexion réseau)

```bash
# Pour une première migration (base vide)
npx prisma migrate diff \
  --from-empty \
  --to-schema prisma/schema.prisma \
  --script > migration.sql

# Pour les migrations suivantes (diff depuis l'état existant)
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script > migration.sql
```

> ⚠️ Ancienne syntaxe `--to-schema-datamodel` supprimée depuis Prisma v6+. Utiliser `--to-schema`.

### Étape 2 — Exécuter le SQL dans Neon SQL Editor

1. Ouvrir [Neon Console](https://console.neon.tech) → **SQL Editor**
2. Coller le contenu de `migration.sql`
3. Cliquer **Run**
4. Vérifier : `Statement executed successfully`

### Étape 3 — Créer le dossier de migration local

```bash
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_nom_migration
cp migration.sql prisma/migrations/YYYYMMDDHHMMSS_nom_migration/migration.sql
```

### Étape 4 — Enregistrer la migration dans `_prisma_migrations` via SQL Editor

> `prisma migrate resolve` nécessite aussi une connexion TCP → utiliser le SQL Editor à la place.

```sql
-- Créer la table si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

-- Insérer la migration comme appliquée
INSERT INTO "_prisma_migrations" 
  ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES 
  (
    gen_random_uuid()::text,
    'manually_applied',
    now(),
    '20260402000000_phase1_fondations',  -- ← adapter le nom
    NULL,
    NULL,
    now(),
    1
  );

-- Vérification
SELECT * FROM "_prisma_migrations";
```

---

## 📦 Migrations appliquées

| Migration | Date | Méthode | Statut |
|-----------|------|---------|--------|
| `20260402000000_phase1_fondations` | 02/04/2026 | SQL Editor manuel | ✅ Applied |

---

## 🚀 Workflow long terme recommandé

### Dev local (depuis Madagascar / réseau TGN)
Modifier prisma/schema.prisma

npx prisma migrate diff --from-migrations ... --to-schema ... --script > migration.sql

Coller migration.sql dans Neon SQL Editor → Run

mkdir + cp migration.sql dans prisma/migrations/

Insérer dans _prisma_migrations via SQL Editor

### Production (Railway)
Ajouter dans le start command Railway :
```bash
npx prisma migrate deploy && node dist/index.js
```
Railway n'est pas bloqué par TGN → les migrations se déploient automatiquement.

### Prisma Studio / introspection
Ces commandes nécessitent aussi une connexion TCP → les éviter depuis le réseau TGN local. Utiliser Railway ou un environnement cloud.

---

## 🗒️ Notes complémentaires

- **Neon compute :** Le compute Neon est en mode **Idle** sur le plan Free. Il se réveille automatiquement à la première connexion (cold start ~1-2s).
- **URL pooler :** Le hostname contient `.c-2.` dans l'URL — c'est normal pour la région `eu-central-1` de Neon depuis 2025.
- **`channel_binding=require` :** Ce paramètre présent dans l'URL Neon par défaut n'est pas supporté par Prisma. Le supprimer de la `DIRECT_URL`.
- **VPN :** ProtonVPN Free ne route pas correctement les ports TCP non-standards depuis Madagascar. Ne pas compter dessus pour contourner le blocage TGN.
- **DNS server `100.100.100.100` :** DNS Alibaba Cloud/Tailscale — présent sur le réseau local mais ne cause pas de problème de résolution.

---

# 🧩 INCIDENTS TECHNIQUES — Phase 2 (Auth & Layouts)

**Période :** 02–03 Avril 2026  
**Contexte :** Implémentation authentification NextAuth v5 + layouts role-based + tests manuels local

## Incident A — `PrismaClientKnownRequestError` sur login/register

### Symptôme
- Erreur dans `db.user.findUnique()` pendant credentials login/register.
- Message initial ambigu: `Invalid invocation`.

### Diagnostic
- Instrumentation ajoutée dans `src/lib/auth.ts` et `src/actions/auth.ts`.
- Cause réelle isolée: problème de connectivité DB (`P1001` / reachability / DNS selon contexte réseau).

### Actions correctives
- Ajout de logs d’erreur Prisma détaillés côté auth (`[auth][prisma]`, `[auth][prisma-init]`).
- Normalisation email (`toLowerCase`) sur register/login credentials pour éviter les incohérences.
- Message d’erreur utilisateur amélioré en cas de panne réseau DB.

### Statut
- ✅ Côté code: corrigé et instrumenté.
- ⚠️ Côté réseau local: dépend des conditions d’accès Neon depuis le FAI.

---

## Incident B — Dépréciation Next.js `middleware` -> `proxy`

### Symptôme
- Warning Next.js 16: `The "middleware" file convention is deprecated. Please use "proxy" instead.`

### Action corrective
- Migration du fichier de protection des routes vers `src/proxy.ts`.
- Conservation des règles d’accès par rôle (platform / trainer / admin) avec matcher identique.

### Statut
- ✅ Résolu.

---

## Incident C — Google OAuth renvoie `error=Configuration` (HTTP 500)

### Symptôme
- Callback Google:
  - `/api/auth/callback/google` -> redirect -> `/api/auth/error?error=Configuration` 500
- Logs initiaux: `AdapterError`, puis diagnostic final:
  - `CallbackRouteError`
  - cause: `TypeError: fetch failed`
  - `code: ETIMEDOUT`
  - `provider: google`

### Diagnostic
- Le problème n’est pas le schéma Prisma `account` (colonnes + indexes validés SQL).
- Le callback OAuth échoue avant finalisation car le serveur local ne joint pas Google à temps (timeout réseau sortant).

### Actions correctives
- Ajout de logs enrichis NextAuth (`[auth][logger][error][inspect]`) pour exposer `cause`.
- Fallback profil Google (nom utilisateur garanti) pour éviter les null constraints.
- Option de contournement local:
  - variable `GOOGLE_OAUTH_DISABLED="true"` pour continuer le dev sans Google.
- Page d’erreur NextAuth redirigée vers `/login` pour éviter écran API 500 brut.

### Statut
- ✅ Diagnostic final obtenu.
- ⚠️ Cause racine locale: connectivité réseau sortante vers endpoints Google (timeout), non un bug SQL.

---

## Incident D — Bruit console navigateur (extensions Chrome)

### Symptôme
- Erreurs `chrome-extension://... net::ERR_FILE_NOT_FOUND`
- `FrameDoesNotExistError` dans `background.js`

### Diagnostic
- Erreurs injectées par extensions navigateur, sans lien avec le code Akaa.

### Action
- Ignorer pour le debug app (ou tester en fenêtre sans extensions).

### Statut
- ✅ Clarifié.

---

## Décisions techniques retenues

1. **Conserver Prisma + schéma actuel** (structure SQL validée pour `account`).
2. **Renforcer l’observabilité Auth** pour isoler rapidement les causes réelles.
3. **Continuer credentials localement** en cas d’instabilité Google OAuth.
4. **Cibler un runtime cloud (Railway) pour OAuth stable** si le réseau local continue à timeout.
