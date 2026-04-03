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

**Note (runtime application) :** L’app utilise l’adaptateur Neon serverless (`src/lib/db.ts`) avec une **WebSocket** vers `wss://…neon.tech/v2` (port 443). Des timeouts (`ETIMEDOUT`) sur ce chemin empêchent login/register en local même sans tester le port 5432 — voir **Incident F** ci-dessous.

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
Ajouter dans le **Start Command** Railway (app Next.js, pas un binaire Node custom) :
```bash
npx prisma migrate deploy && npm run start
```
Railway n'est pas bloqué par TGN → les migrations et la connexion Prisma/Neon fonctionnent depuis le cloud.

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

## Incident E — Déploiement Railway (Railpack) : échecs de build

**Période :** 03 Avril 2026  
**Contexte :** Déploiement de l’app Next.js 16 sur Railway (Railpack) pour contourner les limitations réseau TGN (Neon WSS, Google OAuth).

### Symptôme 1 — TypeScript : `Prisma` absent de `@prisma/client`

**Log Railway :** `Type error: Module '"@prisma/client"' has no exported member 'Prisma'.` dans `src/actions/auth.ts` (idem usage dans `src/lib/auth.ts`).

**Diagnostic :** Le plan de build exécute `npm ci` puis `npm run build` **sans** passer par `prisma generate`. Sans client généré, les types et le namespace `Prisma` ne sont pas disponibles pour `tsc` pendant `next build`.

**Contournement :**
- `package.json` : script `postinstall` → `prisma generate`.
- `package.json` : script `build` → `prisma generate && next build` (garantie avant chaque build manuel).

### Symptôme 2 — `prisma.config.ts` et environnement CI

**Risque :** Sur Railway il n’y a pas de `.env.local` ; si seule `DIRECT_URL` était lue depuis le fichier local, la config Prisma pouvait échouer au chargement pendant `prisma generate`.

**Contournement :** Chaîne de résolution `DIRECT_URL` → `DATABASE_URL` (variables Railway) → URL PostgreSQL factice en dernier recours **uniquement** pour le chargement de config au `generate` (pas de connexion DB au moment du generate). Les migrations en prod continuent d’exiger une vraie `DIRECT_URL` Neon côté déploiement.

### Symptôme 3 — Prérendu `/login` et `useSearchParams`

**Log :** `useSearchParams() should be wrapped in a suspense boundary at page "/login"`.

**Diagnostic :** Next.js 16 impose un boundary `<Suspense>` pour les composants client qui appellent `useSearchParams()` lors de la génération statique / prérendu.

**Contournement :** Dans `src/app/(auth)/login/page.tsx`, envelopper `<LoginForm />` dans `<Suspense>` avec un fallback de chargement (skeleton).

### Statut
- ✅ Build production (`npm run build`) vert en local et sur Railway après ces changements.
- ✅ Déploiement Railway validé par l’équipe.

---

## Incident F — Inscription locale : timeout WebSocket Neon (`wss://…/v2`)

**Contexte :** Même lorsque le TCP 5432/6543 est documenté comme bloqué par TGN, le runtime Prisma + `@neondatabase/serverless` utilise une **WebSocket** vers `wss://ep-….neon.tech/v2`.

**Symptôme :** `AggregateError` / `ETIMEDOUT` sur la WebSocket lors de `registerWithCredentials` (logs serveur avec `ErrorEvent` sur `_url: 'wss://…'`).

**Diagnostic :** Problème de **joignabilité** entre la machine locale et l’endpoint Neon (WSS), pas un bug métier du formulaire d’inscription.

**Contournements :**
- Tester l’inscription et l’auth contre **l’URL Railway** (hors TGN côté serveur).
- Option future : PostgreSQL local en dev si besoin de coder sans cloud.

**Code :** Messages d’erreur utilisateur dans `src/actions/auth.ts` enrichis pour détecter timeout / WebSocket / Neon dans les erreurs (y compris quand `error.message` est vide), via `util.inspect`.

### Statut
- ✅ Comportement documenté ; validation fonctionnelle sur Railway recommandée depuis TGN.

---

## Incident G — Railway : login OK puis `/dashboard` en erreur (« Couldn’t load » / HTTP 500)

**Période :** avril 2026  
**URL de référence :** [https://akaa-production.up.railway.app](https://akaa-production.up.railway.app) (ex. [page login avec callback dashboard](https://akaa-production.up.railway.app/login?callbackUrl=%2Fdashboard))

### Symptômes observés (réseau navigateur)

1. **Première visite** : `GET /dashboard` → **307** → redirection vers `/login?callbackUrl=/dashboard` (comportement attendu si non connecté ; proxy / shell protégé).
2. **Après soumission du formulaire de connexion** : `POST /login?...` → **303 See Other** ; côté client, message du type **« Couldn’t load » / « This page couldn’t load »** (échec de chargement RSC / navigation).
3. **Après rechargement manuel** : `GET /dashboard` → **500 Internal Server Error**.

**Note réseau :** l’adresse IP affichée (ex. `151.101.x.x`) correspond souvent à une **CDN / bordure** (Fastly) devant le service ; ce n’est pas forcément l’IP du conteneur Railway.

### Causes probables (hypothèses testées en code)

| Hypothèse | Détails | Mesure / correctif tenté |
|-----------|---------|---------------------------|
| **Boucle proxy** JWT sans `role` | `getToken` voyait un cookie mais sans `role` → `/login` ↔ `/dashboard`. | Réordonnancement dans `src/proxy.ts` : ne pas envoyer `/login` → `/dashboard` sans rôle valide ; callback JWT n’écrit `role` que si l’utilisateur existe en BDD. |
| **`signIn` client `redirect: false`** | `next-auth/react` fait `new URL(data.url)` ; URL **relative** → exception, formulaire bloqué. | Passage à `redirect: true`, puis **Server Action** + `signIn` serveur (`src/actions/auth.ts`). |
| **Redirection Auth avec mauvaise origine** | `Location` absolue type `http://127.0.0.1:…` après login → navigateur ne suit pas correctement. | `normalizeAuthRedirectTarget()` : ne garder que `pathname` + `search` avant `redirect()`. |
| **`getToken` sans cookie sécurisé (HTTPS)** | En prod, cookie session en `__Secure-…` ; `getToken` par défaut cherchait le mauvais nom → proxy traitait comme non connecté alors que `auth()` voyait une session. | `secureCookie: true` (via `isSecureAuthCookieEnv()`) dans `src/proxy.ts`. |
| **Prisma sur dashboard (500)** | `ProtectedShell` fait `db.user.findUnique` après `auth()` ; échec Prisma/connexion → **500**. | En **production** uniquement : `PrismaClient` avec **`@prisma/adapter-pg` + `Pool`** (`src/lib/db.ts`) au lieu de **Neon WebSocket** ; suppression de `channel_binding` dans l’URL pour `pg` ; **SSL explicite** pour les hôtes `*.neon.tech`. |
| **Variables d’environnement** | `NEXTAUTH_URL` / `AUTH_URL` non alignés sur l’URL publique HTTPS. | Recommandation : `AUTH_URL` + `NEXTAUTH_URL` = URL Railway sans slash final. |

### Fichiers touchés (historique des correctifs)

- `src/proxy.ts` — rôle JWT, `getToken` + `secureCookie`.
- `src/lib/auth.ts` — callback JWT / rôle.
- `src/actions/auth.ts` — `loginWithCredentialsForm`, normalisation redirect, inscription + `signIn` serveur, propagation `NEXT_REDIRECT`.
- `src/components/auth/login-form.tsx` — formulaire + `useActionState` vers l’action serveur.
- `src/components/auth/register-form.tsx` — plus de `signIn` client après création.
- `src/lib/db.ts` — branche **prod** : `pg` + `PrismaPg`, sanitize URL, SSL Neon.

### Pistes si le 500 persiste après dernier déploiement

1. **Logs Railway** au moment exact du `GET /dashboard` : stack Prisma / `pg` / TLS (copier le message d’erreur complet).
2. Vérifier **`DATABASE_URL`** sur Railway : URL **pooled** Neon, `sslmode=require`, **sans** `channel_binding=require` dans la chaîne (ou laisser le sanitize côté code).
3. Option start command : `NODE_OPTIONS=--dns-result-order=ipv4first` (déjà utilisé en dev dans `package.json` pour certains réseaux) si résolution DNS IPv6 pose problème.
4. Ajouter temporairement `src/app/(platform)/error.tsx` pour afficher l’erreur digest / message côté UI (debug).

### Statut

- ⚠️ **Non clos côté produit** au moment de la dernière restitution utilisateur : `GET /dashboard` peut encore renvoyer **500** après login + « Couldn’t load » sur la navigation 303.
- ✅ Correctifs ci-dessus **commités dans le dépôt** ; validation finale = déploiement Railway + lecture des **logs serveur** pour l’erreur exacte du 500.

---

## Incident H — Railway : `/dashboard` 500 après login à cause d’icônes Lucide dans `navItems`

**Date :** 03 Avril 2026

### Symptôme
- `POST /login` retourne **303 See Other**.
- La navigation suivante vers `/dashboard` échoue avec **500**.
- Log Railway:
  `Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".`
  avec une valeur du type `{ $$typeof: ..., render: function, displayName: ... }`.

### Cause racine
- `ProtectedShell` est un **Server Component**.
- Il passait `navItems` à `Sidebar` et `MobileNav`, qui sont des **Client Components**.
- Or `navItems` contenait des références de composants Lucide (`Gauge`, `Shield`, etc.) via la clé `icon`.
- Ces icônes sont des fonctions/composants React non sérialisables à travers la frontière Server -> Client.

### Correctif appliqué
- `src/components/layout/nav-config.ts`
  - remplacement de `icon: LucideIcon` par `icon: NavIconName` (chaîne sérialisable).
- `src/components/layout/nav-icons.tsx`
  - ajout d’une table de mapping locale `NavIconName -> LucideIcon`.
- `src/components/layout/sidebar.tsx`
  - résolution de l’icône côté client via `getNavIcon(item.icon)`.
- `src/components/layout/mobile-nav.tsx`
  - même correction côté navigation mobile.

### Impact
- La config de navigation devient entièrement sérialisable.
- Le shell dashboard ne transmet plus de fonctions React depuis le serveur.
- Ce correctif cible directement l’erreur `digest: '1109689143'` vue dans les logs Railway.

### Statut
- ✅ Cause racine identifiée.
- ✅ Correctif appliqué dans le dépôt local.
- ✅ Validations locales exécutées : `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- ⏭️ Étape suivante : redéploiement Railway pour confirmer la disparition du `500` sur `/dashboard`.

---

## Décisions techniques retenues

1. **Conserver Prisma + schéma actuel** (structure SQL validée pour `account`).
2. **Renforcer l’observabilité Auth** pour isoler rapidement les causes réelles.
3. **Continuer credentials localement** en cas d’instabilité Google OAuth ; sinon utiliser l’instance déployée.
4. **Railway déployé et validé** : build avec `prisma generate`, variables Neon/NextAuth/Google configurées sur le service ; tests auth/OAuth contre l’URL publique du service.
5. **Production Node (Railway)** : préférer **driver `pg` (TCP)** pour Prisma vers Neon plutôt que WebSocket serverless lorsque `NODE_ENV=production` (voir `src/lib/db.ts` et Incident G).
