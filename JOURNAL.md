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
- ✅ Redéploiement Railway effectué.
- ✅ Login mail / mot de passe validé en production.
- ✅ `/dashboard` recharge correctement après authentification.

---

## Incident I — Google OAuth Railway : `OAuthAccountNotLinked` après réactivation

**Date :** 04 Avril 2026

### Symptôme
- Le bouton Google redirigeait correctement vers Google.
- Après retour sur l’application, l’UI affichait seulement `La connexion a échoué`.
- Logs Railway utiles :
  - `type: 'OAuthAccountNotLinked'`
  - `Another account already exists with the same e-mail address`

### Analyse
- Le provider Google était bien configuré côté Google Cloud / Railway.
- Le warning SSL `pg` n’était pas la cause du problème.
- Un utilisateur existait déjà avec le même email en base via credentials.
- Auth.js refusait par défaut de relier automatiquement ce compte local à l’identité Google.

### Correctif appliqué
- `src/lib/auth.ts`
  - activation de `allowDangerousEmailAccountLinking: true` sur le provider Google.
- `src/components/auth/login-form.tsx`
  - amélioration du message d’erreur pour les cas `OAuthAccountNotLinked` / callback OAuth.

### Validation
- ✅ Google OAuth testé sur l’instance Railway : **OK**
- ✅ Auth email / mot de passe testé sur Railway : **OK**

### Notes complémentaires
- L’utilisateur `rindra@nexthope.net` a été promu manuellement en **ADMIN** dans Neon.
- Si le dashboard affiche encore l’ancien rôle dans une session déjà ouverte, il faut simplement **se déconnecter puis se reconnecter** pour rafraîchir le JWT/session enrichi avec `role`.
- Ce point n’est pas un blocage Phase 2 ; c’est un effet de session déjà émise avant le changement de rôle.

---

## Phase 3 — Lancement du contenu pédagogique

**Date :** 04 Avril 2026

### Décision de priorisation
Pour démarrer la Phase 3, le choix retenu a été :
1. poser le **socle serveur** (validations + actions + règles d’accès),
2. rendre l’**espace formateur** réellement utilisable,
3. ouvrir ensuite le **parcours apprenant** sur les contenus publiés.

### Re-cadrage d’architecture
En cours de phase, une décision structurante a été prise pour éviter de figer trop tôt le projet sur un format non adapté à l’import/export :
- abandon de la cible **Tiptap-first**
- bascule vers une stratégie **Markdown-first**
- choix de **MDXEditor** pour l’édition manuelle riche
- lancement de l’import massif **après** cette bascule

Cette décision a été consignée dans `ARCHITECTURE.md` pour rester visible par les autres modèles/agents et éviter les divergences futures.

### Mise en place réalisée
- Création des actions serveur dédiées au contenu dans `src/actions/courses.ts`.
- Ajout des validations Zod `src/lib/validations/course.ts`.
- Ajout d’helpers de contenu :
  - slug
  - compatibilité de lecture entre ancien contenu JSON riche et nouveau contenu Markdown
  - détection vidéo YouTube / Google Drive
- Implémentation des pages formateur :
  - liste des cours
  - création de cours
  - édition de cours
  - édition de chapitre avec **MDXEditor**
  - page d’import de cours
- Implémentation des pages apprenant :
  - catalogue filtrable
  - détail de cours
  - lecteur de chapitre
- Ajout du rendu Markdown côté apprenant via `react-markdown`.
- Ajout des modèles téléchargeables d’import :
  - `manifest.template.csv`
  - `chapter.template.md`
- Ajout de l’import massif :
  - `1 ZIP = 1 cours`
  - `manifest.csv` à la racine
  - `chapters/*.md` pour le contenu

### Arbitrages techniques
- Le réordonnancement modules/chapitres est livré **fonctionnellement** avec boutons `haut/bas`.
- Le vrai **drag & drop visuel** n’a pas encore été ajouté dans cette passe.
- La progression apprenant affichée sur la fiche cours lit les données `ChapterProgress` existantes, mais la logique complète de tracking automatique reste bien dans le périmètre de la **Phase 4**.
- Le support Markdown v1 a été volontairement borné à :
  - titres
  - paragraphes
  - listes
  - citations
  - liens
  - séparateurs
  - `code inline`
  - blocs de code
- Les améliorations **UI/UX** ont été identifiées, mais reportées pour ne pas retarder la livraison fonctionnelle.

### Validation
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`
- ✅ CRUD formateur validé
- ✅ publication de cours validée
- ✅ consultation apprenant validée
- ✅ import de cours validé

### Statut
- ✅ Phase 3 **fonctionnelle livrée**
- ✅ Le contenu pédagogique est éditable côté formateur et consultable côté apprenant
- ✅ L’éditeur manuel est désormais aligné avec la stratégie **Markdown-first**
- ✅ L’import massif de cours est disponible
- ⚠️ Amélioration produit à prévoir sur l’import :
  - aujourd’hui `content_file` est encore requis dans le flux implémenté
  - évolution souhaitée : accepter `content_file` **ou** `video_url`, avec au moins un des deux
- 📝 Le polish UI/UX reste volontairement hors de cette livraison

---

## Incident J — Redirection initiale vers le mauvais dashboard selon le rôle

**Date :** 04 Avril 2026

### Symptôme
- Après connexion avec un compte `TRAINER` ou `ADMIN`, l’utilisateur arrivait sur `/dashboard`.
- Le rôle réel était pourtant correct en base et en session.
- En cliquant ensuite sur le logo de la plateforme, la redirection se faisait correctement vers :
  - `/trainer/dashboard`
  - ou `/admin/dashboard`

### Cause racine
- Le point d’entrée après authentification restait `/dashboard`.
- La page `src/app/(platform)/dashboard/page.tsx` ne re-router pas les utilisateurs non apprenants.
- La landing `/` gérait déjà correctement la redirection par rôle, mais pas `/dashboard`.

### Correctif appliqué
- `src/lib/auth-config.ts`
  - ajout d’un helper `getHomePathForRole()` centralisant la destination par rôle.
- `src/app/page.tsx`
  - utilisation du helper pour rediriger depuis la landing.
- `src/app/(platform)/dashboard/page.tsx`
  - redirection serveur immédiate vers :
    - `/trainer/dashboard` si rôle `TRAINER`
    - `/admin/dashboard` si rôle `ADMIN`
    - maintien sur `/dashboard` pour `LEARNER`

### Validation
- ✅ Login `TRAINER` : arrivée correcte sur `/trainer/dashboard`
- ✅ Login `ADMIN` : arrivée correcte sur `/admin/dashboard`
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`

### Statut
- ✅ Incident corrigé
- ✅ Comportement validé après déploiement

---

## Phase 4 — Quiz et progression réelle

**Date :** 04 Avril 2026

### Décision produit retenue
La règle métier validée pour la phase 4 a été la suivante :
- un chapitre peut avoir `0 ou 1 quiz`
- le quiz reste **optionnel** pour le formateur
- un chapitre sans quiz peut être terminé manuellement par l’apprenant
- un chapitre avec quiz n’est terminé qu’après **réussite** du quiz

Cette règle a été appliquée de manière cohérente dans le back-office formateur, le lecteur apprenant et le calcul de progression.

### Mise en place réalisée
- Ajout du socle de progression dans `src/lib/progress.ts`:
  - création automatique d’inscription (`Enrollment`) si nécessaire
  - passage en `IN_PROGRESS`
  - passage en `COMPLETED`
  - recalcul automatique de `Enrollment.progress_percent`
- Ajout des actions serveur quiz/progression dans `src/actions/quiz.ts`.
- Ajout des validations Zod de la phase 4 dans `src/lib/validations/quiz.ts`.
- Intégration du quiz dans la page d’édition de chapitre formateur.
- Ajout du lecteur quiz côté apprenant.
- Intégration de la progression:
  - dans le lecteur
  - dans la fiche cours
  - dans le catalogue
  - dans le dashboard apprenant

### Arbitrage UX sur le builder quiz
Le premier jet du CRUD quiz fonctionnait, mais l’expérience était trop lourde :
- modification d’une réponse
- soumission
- rechargement
- répétition sur chaque champ

Ce flux a été jugé trop fatigant pour un formateur.

Correctif produit/technique appliqué :
- abandon du mini-CRUD formulaire par formulaire
- remplacement par un **builder client** à édition locale
- sauvegarde serveur en **une seule action**

Le résultat est plus proche d’une UX type Tally :
- les questions et réponses se préparent localement
- l’enregistrement est déclenché à la fin
- les reloads intermédiaires ont été supprimés

### Ajustements apprenant
- Un chapitre sans quiz possède désormais un bouton `Marquer comme terminé`.
- Après validation, l’apprenant est redirigé automatiquement vers le **chapitre suivant**.
- Après réussite d’un quiz, la même logique d’enchaînement est appliquée.

### Sécurité / intégrité
- Les bonnes réponses du quiz ne sont pas exposées dans le payload envoyé au client apprenant.
- La validation serveur reste la source de vérité pour:
  - score
  - réussite / échec
  - statut de progression

### Extension de l’import de cours
Après mise en place du builder, l’import de cours a été étendu pour accepter un quiz optionnel par chapitre.

Choix retenu :
- garder `manifest.csv` comme source principale de structure
- ajouter une colonne optionnelle `quiz_file`
- charger le quiz depuis un fichier JSON dédié dans l’archive ZIP

Livré dans cette passe :
- `manifest.template.csv` mis à jour
- `quiz.template.json` ajouté comme modèle
- import quiz facultatif par chapitre

### Validation
- ✅ Création et édition de quiz validées
- ✅ Passage de quiz côté apprenant validé
- ✅ Progression chapitre validée
- ✅ Progression cours validée
- ✅ Enchaînement automatique vers le chapitre suivant validé
- ✅ Import optionnel des quiz validé
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`

### Statut
- ✅ Phase 4 fonctionnelle livrée
- ✅ Le moteur quiz/progression est en place
- ✅ L’import de quiz est disponible sans être obligatoire
- 📝 Des raffinements UX/UI restent possibles, mais ils ne bloquent pas la clôture de la phase

---

## Phase 5 — Gamification apprenante, périmètre des rôles et niveau des cours

**Date :** 04 Avril 2026

### Décision produit retenue
La phase 5 a été recadrée autour de deux règles structurantes :
- la gamification apprenante (`XP`, `badges`, `streaks`, `leaderboard`) ne concerne que le rôle `LEARNER`
- la difficulté d’un cours est portée par un niveau pédagogique (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) qui module les gains XP apprenant

Le formateur choisit le niveau du cours, mais ne règle pas les coefficients.
Les coefficients XP par niveau sont globaux et gérés par l’admin.

### Correction du périmètre des rôles
Un problème produit est apparu après la première implémentation de la gamification :
- les rôles `TRAINER` et `ADMIN` pouvaient encore afficher ou hériter du système XP apprenant

Ce comportement a été corrigé en profondeur :
- `applyLearningGamification()` ne crédite plus que les `LEARNER`
- le header n’affiche plus les pills XP / streak hors apprenant
- `leaderboard` et `profile` apprenant sont maintenant réservés au rôle `LEARNER`

Résultat :
- le périmètre fonctionnel est cohérent avec l’usage métier
- une éventuelle réputation formateur pourra être conçue plus tard sans mélanger les deux systèmes

### Mise en place du niveau des cours
Le choix retenu a été de ne pas laisser le formateur fixer librement les XP de ses cours.

À la place :
- ajout d’un champ `level` sur le cours
- valeurs supportées :
  - `BEGINNER`
  - `INTERMEDIATE`
  - `ADVANCED`

Ce niveau est maintenant disponible :
- à la création de cours
- à l’édition de cours
- dans l’import de cours via `manifest.csv`
- dans l’affichage des cartes et fiches cours

### Coefficients XP globaux par niveau
Pour éviter une inflation de règles par formateur, le calcul des XP apprenant s’appuie désormais sur une configuration globale stockée en base :
- nouvelle table `xp_level_setting`
- un coefficient par niveau
- pilotage par l’admin via `/admin/xp`

Valeurs initiales retenues :
- `BEGINNER = 1.00`
- `INTERMEDIATE = 1.50`
- `ADVANCED = 2.00`

Ces coefficients sont appliqués aux événements apprenants liés au contenu :
- chapitre terminé
- quiz réussi
- bonus quiz parfait

### Migration base de données
Comme pour les autres évolutions Prisma dans ce contexte réseau, la migration a été préparée localement puis appliquée manuellement via Neon SQL Editor.

Migration ajoutée :
- `prisma/migrations/20260404000100_course_level_and_xp_settings/migration.sql`

Contenu :
- création de l’enum `CourseLevel`
- ajout de la colonne `course.level`
- création de la table `xp_level_setting`
- insertion des trois coefficients par défaut

### Validation
- ✅ Génération Prisma OK
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`
- ✅ Le rôle `LEARNER` continue de gagner XP/badges/streaks
- ✅ Les rôles `TRAINER` et `ADMIN` n’utilisent plus la gamification apprenante
- ✅ L’admin peut régler les coefficients XP par niveau
- ✅ Le formateur peut choisir le niveau du cours
- ✅ L’import de cours prend en charge `course_level`

### Statut
- ✅ Phase 5 fonctionnelle livrée
- ✅ Périmètre des rôles corrigé
- ✅ Niveau de cours et coefficients XP admin en place
- 📝 L’ajustement XP manuel utilisateur reste explicitement reporté à la phase 6

---

## Phase 6 — Back-office admin, désactivation comptes et ajustements UX

**Date :** 04 Avril 2026

### Objectif
Transformer l’espace admin, encore majoritairement placeholder, en vrai back-office d’exploitation.

Le périmètre retenu pour cette passe a couvert :
- gestion utilisateurs
- catégories
- badges
- ajustement XP manuel
- dashboard admin
- supervision des cours

### Désactivation des comptes
La phase 6 a nécessité une évolution du modèle `User` :
- ajout de `is_active`
- conservation des comptes en base sans suppression logique
- blocage des nouvelles connexions pour les utilisateurs désactivés

Décision produit retenue :
- l’admin peut désactiver / réactiver un compte
- un compte désactivé n’accède plus à la plateforme
- le bootstrap admin ne peut ni perdre son rôle admin ni être désactivé

Migration ajoutée :
- `prisma/migrations/20260404000200_user_is_active/migration.sql`

### Gestion utilisateurs
Le premier écran admin utilisateurs fonctionnait, mais il n’était pas assez scalable pour une base cible d’environ 300 comptes.

Évolution apportée :
- recherche par nom / email
- filtre par rôle
- filtre par statut actif / désactivé
- pagination serveur
- double vue :
  - `tableau` pour l’exploitation dense
  - `cartes` pour un usage plus lisible

Résultat :
- la page est exploitable à petite et moyenne volumétrie
- les changements de rôle et d’état sont accessibles directement depuis la vue tableau

### UX catégories
Une faiblesse UX claire est apparue sur le CRUD catégories :
- choix d’icône en texte brut
- couleur seulement via champ hexadécimal

Correctifs appliqués :
- ajout d’un picker visuel d’icônes
- ajout d’un color picker natif
- ajout de suggestions de couleurs
- ajout d’un aperçu en temps réel

Résultat :
- la configuration catégorie devient lisible et bien plus robuste pour un admin non technique

### Badges et XP admin
La phase 5 avait déjà posé les coefficients XP par niveau.
La phase 6 complète cette gouvernance admin avec :
- CRUD badges complet
- réglage des conditions de badge
- bonus XP de badge
- ajustement XP manuel apprenant avec raison obligatoire
- historique récent des ajustements admin

Décision maintenue :
- l’ajustement XP manuel concerne les `LEARNER`
- la gamification apprenante ne s’étend pas aux `TRAINER` ni aux `ADMIN`

### Dashboard admin et supervision des cours
Le dashboard admin placeholder a été remplacé par une vue réelle avec :
- stats utilisateurs
- stats catalogue
- XP distribués
- top apprenants
- derniers comptes créés
- derniers ajustements XP admin

Sur la supervision des cours, un problème UX a été remonté :
- en cliquant sur un cours depuis `/admin/courses`, l’admin basculait implicitement dans le périmètre formateur

Correctif appliqué :
- création d’une vraie fiche `/admin/courses/[courseId]`
- consultation en lecture côté admin
- lien séparé et explicite vers l’édition formateur si nécessaire

Résultat :
- l’admin reste dans son contexte de supervision
- l’ouverture du mode formateur devient un choix volontaire

### Validation
- ✅ Gestion utilisateurs validée
- ✅ Désactivation / réactivation validée
- ✅ Blocage login compte désactivé validé
- ✅ CRUD catégories validé
- ✅ Picker icônes / couleurs validé
- ✅ CRUD badges validé
- ✅ Ajustement XP manuel validé
- ✅ Dashboard admin validé
- ✅ Supervision cours admin validée
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`

### Statut
- ✅ Phase 6 fonctionnelle livrée
- ✅ L’administration MVP est opérationnelle
- ✅ Les ajustements UX critiques de l’espace admin sont intégrés
- 📝 Le polish visuel global reste reporté à la phase 7

---

## Décisions techniques retenues

1. **Conserver Prisma + schéma actuel** (structure SQL validée pour `account`).
2. **Renforcer l’observabilité Auth** pour isoler rapidement les causes réelles.
3. **Continuer credentials localement** en cas d’instabilité Google OAuth ; sinon utiliser l’instance déployée.
4. **Railway déployé et validé** : build avec `prisma generate`, variables Neon/NextAuth/Google configurées sur le service ; tests auth/OAuth contre l’URL publique du service.
5. **Production Node (Railway)** : préférer **driver `pg` (TCP)** pour Prisma vers Neon plutôt que WebSocket serverless lorsque `NODE_ENV=production` (voir `src/lib/db.ts` et Incident G).

---

## Piste structurelle notée — Sidebar phase 7+

Une piste d’évolution a été retenue pour une itération ultérieure du shell applicatif, sans intégration immédiate afin d’éviter une régression sur la navigation stabilisée.

### Idées à réévaluer plus tard
- `SidebarFooter` natif pour structurer proprement la zone de déconnexion et les actions de fin de menu
- `SidebarTrigger` plus standardisé pour le comportement mobile et les états compact/expanded
- `SidebarRail` si le menu latéral devient dense ou nécessite un mode réduit
- éventuels groupes repliables si les sections `trainer` et `admin` grossissent

### Décision actuelle
- conserver la sidebar custom actuelle en phase 7
- reprendre seulement les idées structurelles utiles plus tard
- ne pas migrer maintenant vers un composant sidebar externe tant que le shell visuel reste en stabilisation

---

## Phase 7 — Design system appliqué, états de chargement et passe performance

**Date :** 05 Avril 2026

### Objectif
Finaliser la phase visuelle majeure du MVP sans casser les parcours fonctionnels stabilisés en phases 1 à 6.

L’objectif réel n’était pas seulement “rendre plus beau”, mais aussi :
- rendre l’interface plus lisible
- rendre les transitions plus compréhensibles
- réduire la sensation de lenteur perçue
- sécuriser les derniers flux critiques en production

### Refonte visuelle principale
La première partie de la phase 7 a consisté à appliquer réellement `DESIGN.md` sur les surfaces les plus importantes :
- landing page
- shell principal
- dashboard apprenant
- catalogue
- fiche cours
- lecteur de chapitre

Décisions visuelles retenues :
- conserver le logo en image seule dans les zones de navigation
- renforcer la hiérarchie éditoriale
- garder une UI premium mais lisible, sans casser les patterns déjà validés
- conserver le light mode uniquement

### Navigation et responsive
La navigation mobile était encore incomplète.

Correctifs intégrés :
- ajout d’un vrai menu hamburger mobile
- repositionnement de la déconnexion en bas de la sidebar
- amélioration des états hover / cursor sur les éléments interactifs

Décision retenue :
- ne pas migrer la sidebar actuelle vers un composant externe
- conserver la sidebar custom, tout en gardant des pistes structurelles notées pour plus tard

### Quiz — correction du faux échec en production
Une régression de production est apparue sur la validation d’un quiz réussi.

Symptôme :
- côté utilisateur, message d’erreur de validation
- côté logs Railway, la tentative était pourtant validée et la redirection de succès était déjà calculée

Cause réelle :
- le flux attrapait à tort `NEXT_REDIRECT` dans le `catch`
- un redirect Next.js normal était traité comme une erreur métier

Correctif retenu :
- rethrow explicite des redirect errors Next.js
- journalisation des vraies erreurs seulement

Résultat :
- le quiz réussi redirige normalement vers le chapitre suivant
- les faux messages d’erreur ont disparu

### États de chargement et feedback d’action
Une faiblesse UX claire persistait :
- sur beaucoup de boutons, rien n’indiquait si l’action travaillait réellement
- l’utilisateur pouvait douter, recliquer, ou penser que la plateforme était figée

Améliorations intégrées :
- composant `Spinner` réutilisable
- composant `SubmitButton` basé sur `useFormStatus`
- intégration sur les actions lentes principales :
  - validation quiz
  - fin de chapitre
  - login / register / Google login
  - logout
  - édition de chapitre
  - builder quiz
  - création / import de cours
  - principales actions admin

En complément :
- ajout de surfaces `loading.tsx` spécifiques aux zones `platform`, `trainer` et `admin`

Décision retenue :
- pas de changement de style global des CTA
- ajouter uniquement un feedback `pending` intégré et discret

### Passe performance
Une lenteur perçue d’environ une seconde sur de nombreuses transitions a été remontée.

Le travail effectué a ciblé le vrai coût applicatif avant d’ajouter des loaders partout.

Optimisations retenues :
- session dédupliquée par requête avec cache serveur
- allègement du shell global
- suppression des initialisations de badges inutiles sur les simples pages de consultation
- réduction du travail exécuté à l’ouverture d’un chapitre
- parallélisation de certaines lectures de données sur le lecteur de chapitre

Résultat attendu :
- moins de travail serveur sur chaque navigation
- moins de latence perçue
- loaders réservés aux zones où ils apportent vraiment de la clarté

### Extension formateur validée après la phase 7
Une fois la phase 7 stabilisée, un manque restait visible côté formateur :
- le dashboard formateur était encore un placeholder
- la relation concrète entre une formation et ses apprenants n’était pas exposée dans l’UI

Décision retenue :
- ne pas repousser cela à la phase 8
- traiter immédiatement ce besoin comme une extension légère du périmètre formateur déjà existant

Travail intégré :
- remplacement du placeholder du dashboard formateur par une vraie surface métier
- ajout d’un aperçu d’apprenants sur chaque formation dans `/trainer/courses`
- ajout d’un bouton `Voir tous les apprenants`
- ajout d’une page dédiée par formation avec la liste des inscrits et leur progression

Sur le plan UI :
- intégration d’un composant `Avatar` compatible style shadcn, ajouté manuellement
- raison : le repo ne contient pas de `components.json` initialisé, donc la CLI shadcn n’était pas exploitable telle quelle

Résultat :
- le formateur voit enfin un tableau de bord utile
- il peut relier immédiatement ses formations à des inscrits concrets
- la navigation vers les apprenants de chaque formation est maintenant directe

### Validation
- ✅ Refonte visuelle des surfaces principales validée
- ✅ Navigation mobile validée
- ✅ Quiz validé après correction du redirect
- ✅ États de chargement visibles sur les actions lentes
- ✅ Passe performance intégrée
- ✅ Dashboard formateur réel validé
- ✅ Vue apprenants par formation validée
- ✅ `npm run lint`
- ✅ `npx tsc --noEmit`
- ✅ `npm run build`

### Statut
- ✅ Phase 7 livrée sur le périmètre MVP
- ✅ Le design system est désormais réellement incarné dans l’app
- ✅ Les parcours critiques ont un feedback d’action plus fiable
- ✅ La lenteur perçue a fait l’objet d’une vraie optimisation technique, pas seulement cosmétique
- 📝 Les retouches restantes sont désormais du polish ciblé écran par écran

---

## Phase 8 — Calendrier / Sessions / Parcours

### Recadrage métier validé
Le premier jet de phase 8 traitait encore trop `TrainingProgram` comme un conteneur de sessions.

Décision retenue :
- `Course` = contenu pédagogique
- `TrainingProgram` = ensemble ordonné de cours
- `TrainingSession` = occurrence planifiée liée soit à un cours, soit à un parcours
- une session ne doit pas cibler les deux à la fois
- une session peut restreindre l’accès au contenu lié avec `OPEN` ou `SESSION_ONLY`

Conséquence :
- passage de `parcours -> sessions` à `parcours -> cours`
- ajout d’une table pivot `ProgramCourse`
- ajout d’une contrainte métier `course xor program` sur `training_session`

### Migration Neon — base partiellement migrée
Comme pour les premières phases, le réseau local TGN impose un workflow manuel via Neon SQL Editor.

Problème rencontré :
- la migration phase 8 a été exécutée sur une base déjà partiellement modifiée
- certains enums existaient déjà
- certaines tables existaient dans un ancien format
- cas concret :
  - `training_session` existait sans la colonne `access_policy`
  - l’ajout brut de la contrainte `chk_training_session_single_target` échouait à cause d’anciennes lignes non conformes

Correctifs retenus dans `prisma/migrations/20260405000100_phase8_training_calendar/migration.sql` :
- `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL` pour les enums
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE "training_session" ADD COLUMN IF NOT EXISTS "access_policy"...`
- ajout de `chk_training_session_single_target` en `NOT VALID`

Résultat :
- migration relançable sur Neon
- convergence progressive possible même sur base intermédiaire
- protection des nouvelles écritures sans bloquer l’historique existant

### Surfaces livrées
- apprenant :
  - `/calendar`
  - `/programs`
  - résumé `sessions + parcours` ajouté au dashboard apprenant
- formateur :
  - `/trainer/calendar`
  - `/trainer/programs`
- admin :
  - `/admin/calendar`
  - `/admin/programs`

### Point métier encore ouvert
Le modèle `SESSION_ONLY` est maintenant posé en base, validé en UI et manipulable par les formulaires.

Il reste à brancher ensuite le contrôle d’accès transverse sur les pages de contenu :
- empêcher l’accès à certains cours / parcours si la session liée exige une inscription `APPROVED`
- sans rouvrir les logiques des phases précédentes inutilement

### Validation de stabilisation
Après le recadrage, deux écarts code/base sont apparus en production :
- `training_program` / `program_course` absents ou incomplets sur la page `programs`
- colonne `training_session.access_policy` absente sur la page `calendar`

Traitement retenu :
- reprise du script SQL phase 8 pour qu’il soit relançable sans casser sur Neon
- ajout des `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` nécessaires
- ajout de la contrainte `chk_training_session_single_target` en `NOT VALID` pour tolérer l’historique existant

Résultat :
- page `programs` stabilisée
- page `calendar` stabilisée
- phase 8 utilisable sur la base réelle sans reset complet

### Suite — contrôle d’accès `SESSION_ONLY`
Le verrouillage applicatif a ensuite été branché côté lecture :
- filtrage des catalogues cours et parcours pour masquer les contenus privés aux apprenants non approuvés
- garde serveur sur les pages cours et chapitres pour rediriger vers `/calendar` si l’utilisateur n’a pas d’inscription `APPROVED`
- conservation du comportement normal pour les contenus `OPEN`

### Suite — rendu pédagogique et éditeur chapitre
Le rendu de lecture a été retravaillé pour sortir du simple texte brut :
- headings en Manrope, corps en Inter
- meilleure respiration des paragraphes, listes, tableaux, citations et blocs de code
- `h1` réduit spécifiquement dans les contenus de cours
- support d’images externes dans le renderer

L’éditeur formateur a été étendu dans la même foulée :
- bouton d’insertion d’image par URL
- aperçu direct avec le même renderer que côté apprenant
- le choix produit retenu est de ne pas faire reposer la lisibilité sur des `Entrée` répétées, mais sur des règles d’espacement stables entre blocs et paragraphes

### Suite — notifications in-app
Une première cloche exploitable a été branchée dans le header des espaces protégés :
- compteur de notifications non lues
- liste des dernières notifications
- marquage “lu” directement depuis le header
- navigation rapide vers la surface liée via `relatedUrl`

Portée retenue :
- on livre un MVP utile immédiatement
- sans introduire encore une page dédiée ni des rappels automatiques complets

### Suite — rappels automatiques MVP
Le rappel de session a ensuite été branché sans dépendre d’un cron externe :
- un sync client discret déclenche une server action lors des navigations apprenant
- la server action crée les notifications `SESSION_REMINDER` manquantes uniquement si la fenêtre de rappel est atteinte
- déduplication par session via `relatedUrl`
- refresh applicatif uniquement lorsqu’un nouveau rappel est effectivement créé

Choix d’implémentation :
- pas d’écriture en Server Component pendant le render
- pas de scheduler externe pour cette étape
- comportement opportuniste mais robuste pour le MVP

### Suite — gamification de présence
Le pointage de présence ne se contente plus d’écrire `session_attendance` :
- la récompense XP de session passe par la couche gamification commune
- les badges automatiques savent maintenant évaluer `SESSIONS_ATTENDED`
- deux badges par défaut ont été ajoutés pour matérialiser ce nouveau seuil :
  - `Premier Atelier`
  - `Participant Assidu`
- le pointage déclenche aussi des notifications `XP_GAINED` et `BADGE_UNLOCKED` quand il y a réellement une nouveauté

Résultat :
- pas de double attribution d’XP pour une même session
- badges cohérents avec les présences réellement comptabilisées
- la cloche devient utile jusqu’au bout du flux session
