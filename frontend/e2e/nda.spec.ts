import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const coverPage = (page: Page) => page.getByRole("region", { name: "Cover Page" });
const party = (page: Page, n: 1 | 2) => page.getByRole("group", { name: `Party ${n}` });

async function fillRequired(page: Page) {
  await page.getByRole("textbox", { name: /^Governing Law/ }).fill("Delaware");
  await page.getByRole("textbox", { name: /^Jurisdiction/ }).fill("New Castle, DE");
  await party(page, 1).getByRole("textbox", { name: /^Company/ }).fill("Acme, Inc.");
  await party(page, 1).getByRole("textbox", { name: /^Signer name/ }).fill("Ada Lovelace");
  await party(page, 2).getByRole("textbox", { name: /^Company/ }).fill("Globex");
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // The app has no favicon yet; Chrome's automatic request for it 404s.
    if (m.type() === "error" && !m.location().url.endsWith("/favicon.ico")) errors.push(m.text());
  });
  await page.goto("/");
  // Fail on hydration mismatches or other runtime errors.
  test.info().attach("console-errors", { body: JSON.stringify(errors) });
  await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
  expect(errors, "no console or page errors on load").toEqual([]);
});

test("loads with today's date and downloads disabled", async ({ page }) => {
  const today = await page.evaluate(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  await expect(page.getByLabel(/^Effective Date/)).toHaveValue(today);
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download Word" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Party 2 company is required.");
});

test("renders the full Standard Terms from the templates dataset", async ({ page }) => {
  const clauses = page.getByRole("region", { name: "Standard Terms" }).getByRole("listitem");
  await expect(clauses).toHaveCount(11);
  await expect(clauses.first()).toContainText("1. Introduction.");
  await expect(clauses.last()).toContainText("11. General.");
});

test("live preview follows the form", async ({ page }) => {
  await fillRequired(page);
  await expect(coverPage(page)).toContainText("Delaware");
  await expect(coverPage(page)).toContainText("New Castle, DE");
  await expect(coverPage(page).getByRole("row", { name: /Print Name/ })).toContainText("Ada Lovelace");
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.getByRole("radio", { name: "In perpetuity" }).check();
  await expect(coverPage(page)).toContainText("In perpetuity.");
});

test("downloads a valid PDF", async ({ page }) => {
  await fillRequired(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(10_000);
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled();
});

test("downloads a valid Word document", async ({ page }) => {
  await fillRequired(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Word" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Mutual-NDA-Acme-Inc-Globex.docx");
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
});

test("the page is usable without horizontal scrolling", async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("form controls are reachable by keyboard", async ({ page }) => {
  await page.getByRole("textbox", { name: /^Purpose/ }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Effective Date/)).toBeFocused();
});
