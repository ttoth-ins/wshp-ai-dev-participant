import { expect, test } from "@playwright/test";

// Proves the E2E harness itself is wired (browser launches, app builds and
// serves, a real page renders). Now that the chat UI exists (Linear TTO-7),
// this asserts the chat view's Send button renders. The full SC-01/04/06/07/08
// scenarios from docs/given-when-then.md land with Linear TTO-12.
test("homepage renders the chat view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await expect(page.getByPlaceholder("Type a message…")).toBeVisible();
});
