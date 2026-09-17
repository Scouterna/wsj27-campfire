import { expect, test, type Page } from "@playwright/test"

// The participants section is the first role-gated one, so this walk carries the
// gating claims: the leader's own name for the section, the Deltagare name for the
// administration function, and – for a role outside both – no section at all, with
// its address answering exactly as one that matches nothing.

/**
 * The sign-in screen's one action, and the picker's way back into the application.
 * @param page The page standing on the sign-in screen.
 * @param persona The persona to pick, by the name the stand-in lists them under.
 */
async function signInAs(page: Page, persona: string): Promise<void> {
  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await page.getByRole("link", { name: persona }).click()
}

test("names the section Min avdelning for a leader, in the menu and on the screen", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Min avdelning" })).toBeVisible()
  await expect(page).toHaveTitle("Min avdelning – Campfire")
  await expect(link).toHaveAttribute("aria-current", "page")
})

test("answers a leader's deep link straight into the section", async ({ page }) => {
  // Signed out at the deep address, the gate shows sign-in – and the round trip lands
  // back on the address that was asked for, inside the layout.
  await page.goto("/participants")
  await signInAs(page, "Lars Lindberg")

  await expect(page).toHaveURL(/\/participants(\?|$)/)
  await expect(page.getByRole("heading", { level: 1, name: "Min avdelning" })).toBeVisible()
})

test("names the section Deltagare for the administration function", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Deltagare" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Deltagare" })).toBeVisible()
  await expect(page).toHaveTitle("Deltagare – Campfire")

  // The profile control names the management function rather than the management as a
  // whole, which is the one place a CMT member's line differs from a leader's.
  const pill = page.getByRole("button", { name: "Logga ut Anna Almgren" })
  await expect(pill).toContainText("CMT · Administration")
})

test("hides the section from a role outside it, indistinguishably from nothing", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")

  // No participants entry anywhere in the menus – home is her one section.
  await expect(page.locator(".sidemenu").getByRole("link")).toHaveCount(1)
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Hem" })).toBeVisible()

  // Her opening the section's address answers exactly as an address that matches
  // nothing – same title, same heading, same body, no section marked.
  await page.goto("/participants")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page).toHaveTitle("Sidan finns inte – Campfire")
  const gatedBody = await page.locator("main").innerText()

  await page.goto("/nagon/annan/plats")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page).toHaveTitle("Sidan finns inte – Campfire")
  expect(await page.locator("main").innerText()).toBe(gatedBody)
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0)
})
