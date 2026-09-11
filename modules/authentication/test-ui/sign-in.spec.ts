import { expect, test } from "@playwright/test"

// What this walk proves is that the session never stands in the way of the application:
// the root address answers in a real browser, with no sign-in step in front of it.

test("reaches the application at the root address", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("Campfire")
  await expect(page.getByRole("heading", { level: 1, name: "Hem" })).toBeVisible()
})
