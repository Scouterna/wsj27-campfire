import { expect, test } from "@playwright/test"

// The home screen sits behind the session gate now, so this walk signs in first – the
// round trip through ScoutID is authentication's own walk, this one only claims the
// greeting the signed-in visitor lands on.

test("greets Lars by name once he signs in", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await page.getByRole("link", { name: "Lars Lindberg" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Hej Lars!" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Logga ut" })).toBeVisible()
  await expect(page).toHaveTitle("Campfire")
})
