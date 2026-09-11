import { expect, test } from "@playwright/test"

// The home screen is what the root address serves, so this walk is the whole of what the
// module claims today – the screen renders in a real browser, out of a real build.

test("reaches the application at the root address", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("Campfire")
  await expect(page.getByRole("heading", { level: 1, name: "Hem" })).toBeVisible()
})
