import { expect, test } from "@playwright/test";

import { mockSignedIn } from "./chat";

const session = { token: "test-token", email: "ada@example.com" };

test("signing up opens the creator", async ({ page }) => {
  await page.route("**/api/auth/signup", (route) => route.fulfill({ status: 201, json: session }));
  await page.goto("/");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByLabel("Email").fill(session.email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/create\/$/);
  await expect(page.getByRole("heading", { name: "New document" })).toBeVisible();
  await expect(page.getByText(session.email)).toBeAttached();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("a wrong password shows an error", async ({ page }) => {
  await page.route("**/api/auth/signin", (route) =>
    route.fulfill({ status: 401, json: { detail: "Incorrect email or password." } }),
  );
  await page.goto("/");
  await page.getByLabel("Email").fill(session.email);
  await page.getByLabel("Password").fill("wrongpass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/$/);
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/documents/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("sign out returns to the sign in screen", async ({ page }) => {
  await mockSignedIn(page);
  await page.goto("/create/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("the sign in page is usable at phone width without horizontal scrolling", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
