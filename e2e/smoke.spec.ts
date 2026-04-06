import { expect, test } from "@playwright/test";

test.describe("Smoke — pages publiques", () => {
  test("la page d’accueil affiche la marque et l’accès connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Se connecter/i })).toBeVisible();
    await expect(page.getByText("Akaa", { exact: true }).first()).toBeVisible();
  });

  test("la page login affiche le formulaire", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Bon retour sur Akaa/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible();
  });
});
