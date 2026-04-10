# Serveur MCP Akaa

Ce dossier contient un serveur **Model Context Protocol** (MCP) qui expose
l'API IA d'Akaa (`/api/v1/*`) sous forme de *tools* utilisables directement
par un agent LLM — Claude Desktop, Cursor, ou tout autre client MCP.

Objectif : permettre à un agent de créer et maintenir des cours sur la
plateforme Akaa sans passer par l'UI formateur, tout en respectant les mêmes
règles de validation et d'autorisation.

## Prérequis

1. **Node 20+** (idéalement Node 22). Le script utilise `fetch` natif.
2. **Un jeton API** `akaa_...` généré depuis `/admin/api-tokens` pour un
   compte formateur ou admin actif. Voir la section "Créer un jeton" plus bas.
3. **`tsx`** — déjà présent comme devDependency du projet (`npx tsx` suffit).

## Variables d'environnement

Le serveur attend deux variables :

| Variable            | Exemple                        | Rôle                                        |
| ------------------- | ------------------------------ | ------------------------------------------- |
| `AKAA_API_BASE_URL` | `http://localhost:3000`        | Base URL de l'instance Akaa (sans `/`)     |
| `AKAA_API_TOKEN`    | `akaa_xxxxxxxxxxxxxxxxxxxxxxx` | Jeton Bearer valide, préfixe `akaa_`       |

Si l'une de ces variables est manquante, le serveur échoue immédiatement
avec un message d'erreur explicite sur stderr.

## Lancer le serveur en local

Depuis la racine du projet :

```bash
AKAA_API_BASE_URL=http://localhost:3000 \
AKAA_API_TOKEN=akaa_xxx... \
  npx tsx scripts/mcp-server/index.ts
```

Le serveur affiche sur stderr :

```
[akaa-mcp] Serveur démarré (18 tools, base=http://localhost:3000). En attente de messages…
```

…puis attend des messages JSON-RPC sur stdin (une ligne = un message). En
mode "manuel" tu peux coller une requête `initialize` pour vérifier qu'il
répond, mais en pratique c'est Claude Desktop qui pilote la communication.

## Configurer Claude Desktop

1. Ouvre la config Claude Desktop :
   - **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

2. Ajoute une entrée `akaa` dans `mcpServers`. Voir
   `claude_desktop_config.example.json` dans ce dossier pour un exemple
   complet.

```json
{
  "mcpServers": {
    "akaa": {
      "command": "npx",
      "args": [
        "tsx",
        "/chemin/absolu/vers/Akaa_project/scripts/mcp-server/index.ts"
      ],
      "env": {
        "AKAA_API_BASE_URL": "http://localhost:3000",
        "AKAA_API_TOKEN": "akaa_ton_jeton_ici"
      }
    }
  }
}
```

3. Redémarre complètement Claude Desktop (quit + relance — pas juste fermer
   la fenêtre).

4. Dans une nouvelle conversation, tape :
   > "Peux-tu lister mes cours Akaa ?"

   Claude devrait appeler `akaa_whoami` ou `akaa_list_courses` et afficher
   le résultat. Tu verras l'icône MCP active en bas de la zone de saisie.

## Tools exposées

Le serveur expose **19 tools** au total, toutes préfixées `akaa_` :

### Meta
- `akaa_whoami` — vérifie le jeton + renvoie le user.
- `akaa_list_categories` — lecture seule des catégories de formation.

### Cours
- `akaa_list_courses` — liste paginée, filtre optionnel par statut.
- `akaa_get_course` — détail d'un cours avec ses modules et chapitres.
- `akaa_create_course` — crée un cours (titre obligatoire, slug auto).
- `akaa_update_course` — met à jour un cours existant.
- `akaa_delete_course` — supprime un cours (cascade).

### Modules
- `akaa_list_modules` — modules d'un cours, triés par ordre.
- `akaa_create_module` — crée un module dans un cours.
- `akaa_update_module` — modifie un module existant.
- `akaa_delete_module` — supprime un module (renormalise l'ordre).

### Chapitres
- `akaa_list_chapters` — chapitres d'un module (métadonnées seules).
- `akaa_get_chapter` — détail complet avec le contenu markdown.
- `akaa_create_chapter` — crée un chapitre avec contenu et vidéo optionnelle.
- `akaa_update_chapter` — modifie un chapitre existant.
- `akaa_delete_chapter` — supprime un chapitre.

### Quiz
- `akaa_get_quiz` — récupère le quiz d'un chapitre (ou `null`).
- `akaa_set_quiz` — remplace intégralement le quiz (atomique).
- `akaa_delete_quiz` — supprime le quiz d'un chapitre (idempotent).

## Créer un jeton

1. Connecte-toi à Akaa avec un compte **ADMIN**.
2. Va sur `/admin/api-tokens`.
3. Choisis un compte formateur (ou le tien si tu es aussi formateur) et
   clique "Générer un jeton".
4. **Copie immédiatement** le jeton affiché dans la bannière jaune — il
   n'est montré qu'une seule fois. Si tu le perds, il faudra en regénérer
   un (ce qui révoque l'ancien).

⚠️ Traite le jeton comme un mot de passe : ne le commit pas, ne le colle
pas dans un chat public. Si un jeton fuite, va le révoquer depuis la même
page.

## Limitations

- **Scope** : les tools actuelles couvrent cours + modules + chapitres +
  quiz. Les sessions, parcours, inscriptions, badges et XP ne sont pas
  encore exposés par l'API v1 (on verra dans une phase ultérieure selon les
  besoins).
- **Accès** : un jeton lié à un compte FORMATEUR ne voit que ses propres
  cours. Un jeton ADMIN voit tout.
- **Pas de streaming** : les réponses sont toujours complètes (pas de chunks).
- **Pas de cache** : chaque appel tool déclenche un vrai HTTP vers Akaa.

## Débogage

Le serveur log toutes ses erreurs sur **stderr** (jamais stdout — sinon on
casse le protocole MCP). Pour voir les logs dans Claude Desktop :

- **macOS** : `tail -f ~/Library/Logs/Claude/mcp*.log`
- **Windows** : `%APPDATA%\Claude\Logs\mcp*.log`

Erreurs classiques :

| Message                                      | Cause probable                          |
| -------------------------------------------- | --------------------------------------- |
| `AKAA_API_TOKEN est manquante`               | variable env non passée au script       |
| `semble invalide : doit commencer par akaa_` | jeton mal copié                         |
| `HTTP 401 UNAUTHORIZED`                      | jeton révoqué ou user désactivé         |
| `HTTP 403 FORBIDDEN`                         | jeton d'un LEARNER, pas TRAINER/ADMIN   |
| `HTTP 404 NOT_FOUND`                         | UUID incorrect, ou cours d'un autre formateur |
| `HTTP 400 VALIDATION`                        | champs Zod invalides (détails dans `error.details`) |

## Schéma de couche

```
 ┌────────────────────┐
 │ Claude Desktop     │
 │ (agent IA)         │
 └─────────┬──────────┘
           │ MCP stdio (JSON-RPC)
           ▼
 ┌────────────────────┐
 │ scripts/mcp-server │  ← ce dossier, stateless
 │  - index.ts        │
 │  - tools/*.ts      │
 └─────────┬──────────┘
           │ HTTPS + Bearer token
           ▼
 ┌────────────────────┐
 │ /api/v1/*          │  ← routes Next.js
 │ (authenticateApi…) │
 └─────────┬──────────┘
           │ courses-core helpers (Zod + Prisma)
           ▼
 ┌────────────────────┐
 │ PostgreSQL (Neon)  │
 └────────────────────┘
```

Chaque couche valide ce qu'elle doit valider : le wrapper MCP fait
confiance à l'API v1, l'API v1 fait confiance à `courses-core.ts`,
`courses-core.ts` valide tout avec Zod avant Prisma. Aucune duplication.
