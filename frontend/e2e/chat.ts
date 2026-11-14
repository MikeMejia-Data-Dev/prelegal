import { expect, test, type Page } from "@playwright/test";

import type { DraftState } from "../src/lib/documents/chatApi";
import { defaultFormData } from "../src/lib/nda/buildNda";
import type { Party } from "../src/lib/documents/types";
import type { NdaFormData } from "../src/lib/nda/types";

export const coverPage = (page: Page) => page.getByRole("region", { name: "Cover Page" });

let replyCount = 0;

/** Send a chat message; the mocked /api/chat answers with `next(draft the page sent)`. */
export async function say(page: Page, text: string, next: (draft: DraftState) => DraftState) {
  const reply = `Reply ${++replyCount}`;
  await page.route(
    "**/api/chat",
    async (route) => {
      const { documentId, fields } = route.request().postDataJSON();
      await route.fulfill({ json: { reply, ...next({ documentId, fields }) } });
    },
    { times: 1 },
  );
  await page.getByRole("textbox", { name: "Message" }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(reply)).toBeVisible();
}

/** The AI picks the Mutual NDA (starting from its defaults) and applies `update`. */
export const nda =
  (update: (f: NdaFormData) => NdaFormData = (f) => f) =>
  ({ fields }: DraftState): DraftState => ({
    documentId: "mutual-nda",
    fields: update(fields && "purpose" in fields ? fields : defaultFormData()),
  });

export const setParty = (n: 1 | 2, values: Partial<Party>) =>
  nda((f) => (n === 1 ? { ...f, party1: { ...f.party1, ...values } } : { ...f, party2: { ...f.party2, ...values } }));

/** Pretend to be signed in: a stored session plus mocked document saving. */
export async function mockSignedIn(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("prelegal.session", JSON.stringify({ token: "test-token", email: "ada@example.com" })),
  );
  await page.route("**/api/documents", (route) =>
    route.fulfill({ status: 201, json: { id: 1, documentId: "x", title: "x", createdAt: "2026-11-14T00:00:00+00:00" } }),
  );
}

/** Open the creator signed in, and fail on hydration mismatches or other runtime errors. */
export async function openCreator(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await mockSignedIn(page);
  await page.goto("/create/");
  test.info().attach("console-errors", { body: JSON.stringify(errors) });
  await expect(page.getByRole("heading", { name: "New document" })).toBeVisible();
  expect(errors, "no console or page errors on load").toEqual([]);
}
