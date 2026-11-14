import { expect, test, type Page } from "@playwright/test";

import { say } from "./chat";

// Uses the real backend (accounts, saved documents); only the AI is mocked.
// Run against the container: E2E_BASE_URL=http://localhost:8000 npx playwright test accounts
test.skip(!process.env.E2E_BASE_URL, "needs the real backend: set E2E_BASE_URL");

const PASSWORD = "correct horse battery";
const party = (company: string) => ({ company, name: "", title: "", noticeAddress: "" });
const pilot = (company1: string, company2: string) => () => ({
  documentId: "pilot",
  fields: {
    keyTerms: [
      { key: "effectiveDate", value: "January 1, 2027" },
      { key: "pilotPeriod", value: "90 days" },
      { key: "generalCapAmount", value: "$10,000" },
      { key: "governingLaw", value: "Delaware" },
      { key: "chosenCourts", value: "New Castle County, Delaware" },
    ],
    party1: party(company1),
    party2: party(company2),
  },
});

async function signUp(page: Page, email: string) {
  await page.goto("/signup/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "New document" })).toBeVisible();
}

async function downloadPdf(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  return download.suggestedFilename();
}

test("sign up, save a document by downloading it, and find it again after signing back in", async ({ page }) => {
  const email = `ada-${Date.now()}-${test.info().project.name}@example.com`;
  await signUp(page, email);

  await say(page, "A pilot agreement please", pilot("Acme, Inc.", "Globex"));
  expect(await downloadPdf(page)).toBe("Pilot-Agreement-Acme-Inc-Globex.pdf");
  await expect(page.getByText("Saved to My documents.")).toBeVisible();

  await page.getByRole("link", { name: "My documents" }).first().click();
  const saved = page.getByRole("list", { name: "Saved documents" }).getByRole("link");
  await expect(saved).toHaveCount(1);
  await expect(saved).toContainText("Pilot Agreement · Acme, Inc. & Globex");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "New document" })).toBeVisible();

  await page.getByRole("link", { name: "My documents" }).first().click();
  await page.getByRole("link", { name: /Pilot Agreement · Acme, Inc. & Globex/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pilot Agreement · Acme, Inc. & Globex" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cover Page" })).toContainText("90 days");
  await expect(page.getByRole("note", { name: "Disclaimer" })).toBeVisible();
  expect(await downloadPdf(page)).toBe("Pilot-Agreement-Acme-Inc-Globex.pdf");
});

test("users don't see each other's documents", async ({ page }) => {
  const suffix = `${Date.now()}-${test.info().project.name}`;
  await signUp(page, `owner-${suffix}@example.com`);
  await say(page, "A pilot agreement please", pilot("Owner Co", "Partner Co"));
  await downloadPdf(page);
  await expect(page.getByText("Saved to My documents.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signUp(page, `other-${suffix}@example.com`);
  await page.getByRole("link", { name: "My documents" }).first().click();
  await expect(page.getByRole("heading", { name: "No documents yet" })).toBeVisible();
});

test("a duplicate email gets a clear error", async ({ page }) => {
  const email = `dup-${Date.now()}-${test.info().project.name}@example.com`;
  await signUp(page, email);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/signup/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("An account with this email already exists.");
});
