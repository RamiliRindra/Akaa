# Tests E2E (Playwright)

- **Vitest** (`npm test`) : tests unitaires — inchangé.
- **Playwright** (`npm run test:e2e`) : parcours navigateur.

## Local

1. Variables d’environnement habituelles (`.env.local`) : `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.
2. Terminal 1 : `npm run dev`
3. Terminal 2 : `npm run test:e2e`  
   Le serveur sur `:3000` est réutilisé (`reuseExistingServer`).

### Connexion (optionnel)

Pour activer `e2e/auth.spec.ts` :

```bash
export E2E_EMAIL="user@example.com"
export E2E_PASSWORD="motdepasse"
npm run test:e2e
```

## CI (GitHub Actions)

- Le job **quality** (lint + Vitest) tourne sur chaque push/PR sans secret.
- Le job **e2e** ne s’exécute que si le dépôt définit **`DATABASE_URL`** (et les variables nécessaires au build Next).  
  **Minimum** : `DATABASE_URL`, `NEXTAUTH_SECRET` (et `DIRECT_URL` si tu l’utilises déjà ailleurs ; sinon le workflow retombe sur `DATABASE_URL`).
- **`E2E_EMAIL` / `E2E_PASSWORD`** : optionnels. Sans eux, **`e2e/auth.spec.ts` est ignoré** (comportement normal) ; seuls les tests **smoke** tournent.

Voir `.github/workflows/ci.yml`.

## Rapports

Après un run local : `npx playwright show-report` (dossier `playwright-report/`).
