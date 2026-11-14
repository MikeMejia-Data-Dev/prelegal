import { expect, test } from "@playwright/test";

test("fake sign-in brings the user to the NDA creator", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/nda\/$/);
  await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
});

test("sign-in works with empty fields (no authentication yet)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
});

test("sign out returns to the login screen", async ({ page }) => {
  await page.goto("/nda/");
  await page.getByRole("link", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
