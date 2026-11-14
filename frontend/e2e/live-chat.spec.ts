import { expect, test } from "@playwright/test";

// Signs up for real so the AI calls are authenticated.
test.beforeEach(async ({ page }) => {
  await page.goto("/signup/");
  await page.getByLabel("Email").fill(`live-${Date.now()}-${Math.random()}@example.com`);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("heading", { name: "New document" }).waitFor();
});

// Talks to the real AI. Run against the container:
// E2E_LIVE=1 E2E_BASE_URL=http://localhost:8000 npx playwright test live-chat
test.skip(!process.env.E2E_LIVE, "set E2E_LIVE=1 to call the real AI");

test("the real AI fills in the NDA from a conversation", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/create/");
  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill(
    "Mutual NDA between Acme Inc and Globex Corp to evaluate a partnership. Delaware law, courts in Wilmington, Delaware.",
  );
  await message.press("Enter");
  const coverPage = page.getByRole("region", { name: "Cover Page" });
  await expect(coverPage).toContainText("Delaware", { timeout: 60_000 });
  await expect(coverPage).toContainText("Acme");
  await expect(coverPage).toContainText("Globex");
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  await expect(page.getByRole("log", { name: "Conversation" }).getByRole("listitem")).toHaveCount(3);
});

test("the real AI picks and fills a Cloud Service Agreement", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/create/");
  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill("I need a cloud service agreement. Acme Inc is the provider and Globex is the customer. Fees are $500 per month.");
  await message.press("Enter");
  const coverPage = page.getByRole("region", { name: "Cover Page" });
  await expect(coverPage.getByRole("heading", { level: 2 })).toHaveText("Cloud Service Agreement", { timeout: 60_000 });
  await expect(coverPage).toContainText("Acme");
  await expect(coverPage).toContainText("$500");
  await expect(page.getByRole("log", { name: "Conversation" }).getByRole("listitem").last()).toContainText("?");
  await expect(message).toBeFocused();
});

test("the real AI offers an alternative for an unsupported document", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/create/");
  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill("I need a residential lease agreement for my apartment.");
  await message.press("Enter");
  const conversation = page.getByRole("log", { name: "Conversation" });
  await expect(conversation.getByRole("listitem")).toHaveCount(3, { timeout: 60_000 });
  await expect(conversation.getByRole("listitem").last()).toContainText("?");
  await expect(page.getByRole("region", { name: "Supported documents" })).toBeVisible();
});
