import { expect, test } from "@playwright/test"

// Each module owns its own Playwright project, so a walk lives beside the module it
// belongs to. This one proves a real browser reaches the application the register is
// composed into – which, signed out, is the session gate showing the sign-in screen.

test("reaches the application at the root address", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("Campfire")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Äventyret\s*börjar här/)
})
