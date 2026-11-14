import { readFile } from "node:fs/promises";

import JSZip from "jszip";

import { expect, test, type Page } from "@playwright/test";

import type { NdaFormData, Party } from "../src/lib/nda/types";

const coverPage = (page: Page) => page.getByRole("region", { name: "Cover Page" });

let replyCount = 0;

/** Send a chat message; the mocked /api/chat applies `update` to the fields the page sends. */
async function say(page: Page, text: string, update: (f: NdaFormData) => NdaFormData) {
  const reply = `Reply ${++replyCount}`;
  await page.route(
    "**/api/chat",
    async (route) => {
      const { fields } = route.request().postDataJSON();
      await route.fulfill({ json: { reply, fields: update(fields) } });
    },
    { times: 1 },
  );
  await page.getByRole("textbox", { name: "Message" }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(reply)).toBeVisible();
}

const setParty = (n: 1 | 2, values: Partial<Party>) => (f: NdaFormData) =>
  n === 1 ? { ...f, party1: { ...f.party1, ...values } } : { ...f, party2: { ...f.party2, ...values } };

const fillRequired = (page: Page) =>
  say(page, "Acme and Globex under Delaware law", (f) => ({
    ...f,
    governingLaw: "Delaware",
    jurisdiction: "New Castle, DE",
    party1: { ...f.party1, company: "Acme, Inc.", name: "Ada Lovelace" },
    party2: { ...f.party2, company: "Globex" },
  }));

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/nda/");
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
  const [y, m, d] = today.split("-").map(Number);
  const long = new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  await expect(coverPage(page)).toContainText(long);
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

test("the chat greets the user and the preview follows the AI's updates", async ({ page }) => {
  await expect(page.getByRole("log", { name: "Conversation" })).toContainText("draft a Mutual NDA");
  await fillRequired(page);
  await expect(page.getByRole("log", { name: "Conversation" })).toContainText("Acme and Globex under Delaware law");
  await expect(coverPage(page)).toContainText("Delaware");
  await expect(coverPage(page)).toContainText("New Castle, DE");
  await expect(coverPage(page).getByRole("row", { name: /Print Name/ })).toContainText("Ada Lovelace");
  await expect(page.getByRole("status")).toHaveCount(0);

  await say(page, "Keep it confidential forever", (f) => ({ ...f, confidentialityTerm: { kind: "perpetual" } }));
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

test("the chat can be used with the keyboard", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: { reply: "Got it.", fields: route.request().postDataJSON().fields } }),
  );
  await page.getByRole("textbox", { name: "Message" }).fill("Hello");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Got it.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("");
});

test("shows an error when the assistant is unavailable", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ status: 500 }));
  await page.getByRole("textbox", { name: "Message" }).fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("region", { name: "Chat" }).getByRole("alert")).toContainText("The assistant couldn't respond");
});

test("PDF embeds the Unicode font and keeps Latin Extended / Cyrillic names", async ({ page }) => {
  await fillRequired(page);
  await say(page, "Party 2 is Łódź Sp. z o.o.", setParty(2, { company: "Łódź Sp. z o.o.", name: "Жуков" }));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Mutual-NDA-Acme-Inc-Lodz-Sp-z-o-o.pdf");
  const pdf = (await readFile((await download.path())!)).toString("latin1");
  expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSans/);
});

test("PDF is blocked with an explanation for characters the font lacks; Word still works", async ({ page }) => {
  await fillRequired(page);
  await say(page, "Signer is 山田", setParty(2, { name: "山田" }));
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  await expect(page.getByRole("note")).toContainText("The PDF can't display these characters: 山 田");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Word" }).click(),
  ]);
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  expect(await zip.file("word/document.xml")!.async("string")).toContain("山田");
});

test("a long email address wraps inside the preview table without stretching its column", async ({ page }) => {
  await fillRequired(page);
  const email = "averyveryverylongemailaddresswithnobreaks.legal.department@subsidiary.example-corporation.com";
  await say(page, "Long email", setParty(1, { noticeAddress: email }));
  const widths = await coverPage(page)
    .locator("thead th")
    .evaluateAll((ths) => ths.map((th) => Math.round(th.getBoundingClientRect().width)));
  expect(Math.abs(widths[1] - widths[2])).toBeLessThanOrEqual(1);
  const table = await coverPage(page).locator("table").boundingBox();
  const wrapper = await coverPage(page).locator("table").locator("xpath=..").boundingBox();
  expect(table!.width).toBeLessThanOrEqual(wrapper!.width + 1);
});

test("multi-line Modifications keep their line breaks in the preview", async ({ page }) => {
  await say(page, "Two changes", (f) => ({ ...f, modifications: "1. Section 3(d) deleted.\n2. Term extended." }));
  const value = coverPage(page).locator("dt", { hasText: "MNDA Modifications" }).locator("xpath=following-sibling::dd[last()]");
  const box = await value.boundingBox();
  const lineHeight = await value.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  expect(box!.height).toBeGreaterThan(lineHeight * 1.5);
});
