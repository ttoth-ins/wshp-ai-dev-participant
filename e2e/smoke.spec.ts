import { expect, test } from "@playwright/test";

// Proves the E2E harness itself is wired (browser launches, app builds and
// serves, a real page renders). Replace with the SC-01/04/06/07/08 scenarios
// from docs/given-when-then.md once the chat UI (Linear TTO-7 onward) exists.
test("homepage renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("It works!")).toBeVisible();
});
