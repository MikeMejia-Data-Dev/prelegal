import { expect, test } from "@playwright/test";

// Talks to the real AI. Run against the container:
// E2E_LIVE=1 E2E_BASE_URL=http://localhost:8000 npx playwright test live-chat
test.skip(!process.env.E2E_LIVE, "set E2E_LIVE=1 to call the real AI");

test("the real AI fills in the NDA from a conversation", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/nda/");
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
