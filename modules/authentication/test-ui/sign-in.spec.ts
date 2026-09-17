import { expect, test, type Page } from "@playwright/test"

// What these walks prove is the whole of sign-in in a real browser: the gate in front of
// every address, the round trip out to ScoutID and back to where it started, the theme
// the signed-in person wears, the silent refresh behind a stale access token, and a
// sign-out that ends both sessions. What proves somebody is in is the chrome around
// the start screen – the profile control naming them – and that control is the way out.
//
// The walks share one mock, but every session in it – the auth service's and the ScoutID
// stand-in's alike – lives in cookies each test's own browser context keeps, so the
// walks cannot sign each other in or out and run in parallel like every other spec.

/**
 * The sign-in screen's one action, and the picker's way back into the application.
 * @param page The page standing on the sign-in screen.
 * @param persona The persona to pick, by the name the stand-in lists them under.
 */
async function signInAs(page: Page, persona: string): Promise<void> {
  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await page.getByRole("link", { name: persona }).click()
}

/**
 * Asserts that the page is showing the sign-in screen, and nobody's session.
 * @param page The page to look at.
 */
async function expectSignInScreen(page: Page): Promise<void> {
  // The headline is one heading with a line break in it, so the assertion allows the
  // break rather than pinning the whitespace the markup happens to use.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Äventyret\s*börjar här/)
  await expect(page.getByRole("button", { name: "Logga in med ScoutID" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Logga ut/ })).toHaveCount(0)
}

test("meets a signed-out visitor with the sign-in screen, whatever they asked for", async ({
  page,
}) => {
  await page.goto("/")
  await expectSignInScreen(page)

  // The gate is in front of every address, not only the front door.
  await page.goto("/nagon/annan/plats")
  await expectSignInScreen(page)
})

test("returns Lars to the address he asked for, dressed in his unit's color", async ({ page }) => {
  await page.goto("/nagon/annan/plats")

  await signInAs(page, "Lars Lindberg")

  // Back where sign-in started rather than at the front door – which for this address
  // is the not-found page, signed in and inside the chrome, with the way out showing
  // who arrived.
  await expect(page).toHaveURL(/\/nagon\/annan\/plats(\?|$)/)
  await expect(page.getByRole("button", { name: "Logga ut Lars Lindberg" })).toBeVisible()
  // Unit 1 is yellow, and the unit is what the application colors itself after.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "yellow")
})

test("dresses the contingent management in red, whatever the function", async ({ page }) => {
  await page.goto("/")

  // Karin leads no unit, so the list of participants is asked and places her in none – the
  // management's red is what is left, and it wins over the remembered theme.
  await signInAs(page, "Karin Kron")

  await expect(page.getByRole("button", { name: "Logga ut Karin Kron" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "red")
})

test("goes straight back in on a reload, and again once the access token is gone", async ({
  context,
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("button", { name: "Logga ut Lars Lindberg" })).toBeVisible()

  // A live session is not asked to sign in again.
  await page.reload()
  await expect(page.getByRole("button", { name: "Logga ut Lars Lindberg" })).toBeVisible()

  // Only the short-lived access token goes; the refresh cookie stays, which is the one
  // retry in the gate recovering the session without the visitor noticing. The name is
  // asserted first: were it to drift from the service's, clearing would quietly remove
  // nothing and this walk would pass without proving the recovery it exists for.
  const cookies = await context.cookies()
  expect(cookies.map((cookie) => cookie.name)).toContain("wsj27-auth_access-token")
  await context.clearCookies({ name: "wsj27-auth_access-token" })
  await page.reload()
  await expect(page.getByRole("button", { name: "Logga ut Lars Lindberg" })).toBeVisible()
})

test("signs out to the sign-in screen, and lets the next person in with nothing of the last", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("button", { name: "Logga ut Lars Lindberg" })).toBeVisible()

  // The chrome's profile control is the one way out.
  await page.getByRole("button", { name: "Logga ut Lars Lindberg" }).click()

  // Landing back on the sign-in screen is the confirmation that sign-out took.
  await expectSignInScreen(page)

  // The stand-in's own session ended too, so it asks who is signing in rather than
  // waving the last persona through.
  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Vem loggar in?" })).toBeVisible()

  await page.getByRole("link", { name: "Anders Andersson" }).click()

  await expect(page.getByRole("button", { name: "Logga ut Anders Andersson" })).toBeVisible()
  // Unit 2 is green, and nothing of unit 1's leader survives the change.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "green")
  await expect(page.getByText("Lars")).toHaveCount(0)
})

test("remembers a theme asked for signed out, across the sign-in round trip", async ({ page }) => {
  await page.goto("/?theme=brown")

  await expectSignInScreen(page)
  await expect(page.locator("html")).toHaveAttribute("data-theme", "brown")

  // Olle is in no unit and in no management role, so there is nothing to override what
  // this browser was asked to wear.
  await signInAs(page, "Olle Ohlsson")

  await expect(page.getByRole("button", { name: "Logga ut Olle Ohlsson" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "brown")
})
