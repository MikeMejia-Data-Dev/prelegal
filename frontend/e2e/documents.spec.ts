import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { coverPage, openCreator, say } from "./chat";

const party = (company: string) => ({ company, name: "", title: "", noticeAddress: "" });

/** The AI picks the Cloud Service Agreement with every required key term filled in. */
const completeCsa = () => ({
  documentId: "csa",
  fields: {
    keyTerms: [
      { key: "effectiveDate", value: "January 1, 2027" },
      { key: "subscriptionPeriod", value: "1 year" },
      { key: "fees", value: "$1,000 per month" },
      { key: "generalCapAmount", value: "Fees paid in the prior 12 months" },
      { key: "governingLaw", value: "Delaware" },
      { key: "chosenCourts", value: "New Castle County, Delaware" },
    ],
    party1: party("Acme, Inc."),
    party2: party("Globex"),
  },
});

const download = async (page: Page, button: string) => {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: button }).click()]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
};

test.beforeEach(async ({ page }) => {
  await openCreator(page);
});

test("lists the supported agreements until one is chosen", async ({ page }) => {
  await expect(page.getByRole("log", { name: "Conversation" })).toContainText("Which agreement do you need");
  await expect(page.getByRole("region", { name: "Supported documents" }).getByRole("listitem")).toHaveCount(11);
  await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
});

test("stays on the list when the AI offers an alternative to an unsupported document", async ({ page }) => {
  await say(page, "I need an employment contract", () => ({ documentId: null, fields: null }));
  await expect(page.getByRole("region", { name: "Supported documents" })).toBeVisible();
  await expect(coverPage(page)).toHaveCount(0);
});

test("the chat can be used with the keyboard and keeps focus in the message box", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ json: { reply: "Got it.", documentId: null, fields: null } }));
  const box = page.getByRole("textbox", { name: "Message" });
  await box.fill("Hello");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Got it.")).toBeVisible();
  await expect(box).toHaveValue("");
  await expect(box).toBeFocused();
});

test("returns focus to the message box after clicking Send", async ({ page }) => {
  await say(page, "Hello", () => ({ documentId: null, fields: null }));
  await expect(page.getByRole("textbox", { name: "Message" })).toBeFocused();
});

test("shows an error when the assistant is unavailable", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ status: 500 }));
  await page.getByRole("textbox", { name: "Message" }).fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("region", { name: "Chat" }).getByRole("alert")).toContainText("The assistant couldn't respond");
});

test("previews a Cloud Service Agreement with its party roles and nested terms", async ({ page }) => {
  await say(page, "Cloud service agreement, Acme is the provider", () => ({
    documentId: "csa",
    fields: { keyTerms: [], party1: party("Acme, Inc."), party2: party("") },
  }));
  await expect(coverPage(page).getByRole("heading", { level: 2 })).toHaveText("Cloud Service Agreement");
  await expect(coverPage(page).getByRole("columnheader", { name: "PROVIDER" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Standard Terms" })).toContainText("1.1 Access and Use.");
  await expect(page.getByRole("status")).toContainText("Customer company is required.");
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("downloads a completed Cloud Service Agreement as PDF and Word", async ({ page }) => {
  await say(page, "Here are all the details", completeCsa);
  const pdf = await download(page, "Download PDF");
  expect(pdf.name).toBe("CSA-Acme-Inc-Globex.pdf");
  expect(pdf.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pdf.bytes.length).toBeGreaterThan(20_000);
  const word = await download(page, "Download Word");
  expect(word.name).toBe("CSA-Acme-Inc-Globex.docx");
  expect(word.bytes.subarray(0, 2).toString("latin1")).toBe("PK");
});
