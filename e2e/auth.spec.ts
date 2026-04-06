import { expect, test } from "@playwright/test";

/**
 * Nécessite E2E_EMAIL + E2E_PASSWORD (compte credentials valide en base).
 * Sans ces variables, les tests sont ignorés (CI peut omettre les secrets E2E).
 */
const email = process.env.E2E_EMAIL?.trim();
const password = process.env.E2E_PASSWORD;

test.describe("Parcours connexion apprenant", () => {
  test.beforeEach(() => {
    test.skip(!email || !password, "Définir E2E_EMAIL et E2E_PASSWORD pour ce scénario.");
  });

  test("connexion credentials puis dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Email/i).fill(email!);
    await page.getByLabel(/^Mot de passe$/i).fill(password!);
    await page.getByRole("button", { name: /^Se connecter$/i }).click();

    // Compte apprenant attendu ; formateur / admin ont une autre home.
    await expect(page).toHaveURL(
      /\/(dashboard|trainer\/dashboard|admin\/dashboard)/,
      { timeout: 30_000 },
    );
    await expect(page.getByRole("main")).toBeVisible();
  });
});
