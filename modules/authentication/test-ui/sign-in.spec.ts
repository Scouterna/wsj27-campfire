import { expect, test, type Page } from "@playwright/test"

// What these walks prove is the whole of sign-in in a real browser: the gate in front of
// every address, the round trip out to ScoutID and back to where it started, the theme
// the signed-in person wears, the silent refresh behind a stale access token, and a
// sign-out that ends both sessions. What proves somebody is in is the chrome around
// the start screen – the profile control naming them – and that control leads to the
// profile page, which shows who they are and holds the one way out.
//
// The walks share one mock, but every session in it – the auth service's and the ScoutID
// stand-in's alike – lives in cookies each test's own browser context keeps, so the
// walks cannot sign each other in or out and run in parallel like every other spec.

// The reveal is timed, and until its moment a leader's unit – its color included – is
// behind the curtain. These walks are about the sign-in round trip and the theming
// that follows it, so each page opens with the development bypass set.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("campfire-reveal", JSON.stringify(["units"]))
  })
})

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
  await expect(page.getByRole("link", { name: /^Profil för/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Logga ut" })).toHaveCount(0)
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
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()
  // Unit 1 is yellow, and the unit is what the application colors itself after.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "yellow")
})

test("dresses the contingent management in red, whatever the function", async ({ page }) => {
  await page.goto("/")

  // Karin leads no unit, so the list of participants is asked and places her in none – the
  // management's red is what is left, and it wins over the remembered theme.
  await signInAs(page, "Karin Kron")

  await expect(page.getByRole("link", { name: "Profil för Karin Kron" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "red")
})

test("goes straight back in on a reload, and again once the access token is gone", async ({
  context,
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()

  // A live session is not asked to sign in again.
  await page.reload()
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()

  // Only the short-lived access token goes; the refresh cookie stays, which is the one
  // retry in the gate recovering the session without the visitor noticing. The name is
  // asserted first: were it to drift from the service's, clearing would quietly remove
  // nothing and this walk would pass without proving the recovery it exists for.
  const cookies = await context.cookies()
  expect(cookies.map((cookie) => cookie.name)).toContain("wsj27-auth_access-token")
  await context.clearCookies({ name: "wsj27-auth_access-token" })
  await page.reload()
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()
})

test("signs out to the sign-in screen, and lets the next person in with nothing of the last", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()

  // The profile control leads to the profile page and ends nothing on the way – the
  // page arrives signed in, cross-faded in as a start of its own: a detail of no
  // screen, so nothing above its title leads back to one.
  await page.getByRole("link", { name: "Profil för Lars Lindberg" }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole("heading", { level: 1, name: "Profil" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-nav", "fade")
  await expect(page.locator(".pageheading .eyebrow")).toHaveCount(0)

  // The control stays where it was, so the chrome holds still – marked as the page
  // showing, and a press on it goes nowhere.
  const pill = page.getByRole("link", { name: "Profil för Lars Lindberg" })
  await expect(pill).toHaveAttribute("aria-current", "page")
  await pill.click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole("heading", { level: 1, name: "Profil" })).toBeVisible()

  // The page's one action is the one way out.
  await page.getByRole("button", { name: "Logga ut" }).click()

  // Landing back on the sign-in screen is the confirmation that sign-out took.
  await expectSignInScreen(page)

  // The stand-in's own session ended too, so it asks who is signing in rather than
  // waving the last persona through.
  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Vem loggar in?" })).toBeVisible()

  await page.getByRole("link", { name: "Anders Andersson" }).click()

  await expect(page.getByRole("link", { name: "Profil för Anders Andersson" })).toBeVisible()
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

  await expect(page.getByRole("link", { name: "Profil för Olle Ohlsson" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "brown")
})

test("shows a leader their mark, their name, and their unit", async ({ page }) => {
  await page.goto("/profile")
  await signInAs(page, "Lars Lindberg")

  // Sign-in returns to the address it started from, so the page is its own deep link.
  await expect(page.getByRole("heading", { level: 1, name: "Profil" })).toBeVisible()
  const card = page.locator(".profile-screen")
  await expect(card.getByText("Lars Lindberg")).toBeVisible()
  await expect(card.locator(".unit-avatar")).toBeVisible()
  await expect(card.getByText("Ledare · Avdelning 1")).toBeVisible()
})

test("keeps a leader's unit off the page until the units are revealed", async ({ page }) => {
  // After the bypass every walk opens with, so the curtain is closed for this one –
  // held shut by a clock before the moment, because the moment itself passes.
  await page.addInitScript(() => {
    localStorage.removeItem("campfire-reveal")
  })
  await page.clock.setFixedTime(new Date("2026-09-01T12:00:00+02:00"))

  await page.goto("/profile")
  await signInAs(page, "Lars Lindberg")

  // Exactly what the chrome's own control holds back: the mark, and the unit on the
  // role line.
  const card = page.locator(".profile-screen")
  await expect(card.getByText("Lars Lindberg")).toBeVisible()
  await expect(card.locator(".unit-avatar")).toHaveCount(0)
  await expect(card.getByText("Ledare", { exact: true })).toBeVisible()
  await expect(card.getByText("Avdelning")).toHaveCount(0)
})

test("names a management member's function under their name", async ({ page }) => {
  await page.goto("/profile")
  await signInAs(page, "Karin Kron")

  const card = page.locator(".profile-screen")
  await expect(card.getByText("Karin Kron")).toBeVisible()
  await expect(card.locator(".unit-avatar")).toBeVisible()
  await expect(card.getByText("CMT · HoC")).toBeVisible()
})

test("shows somebody with no role their name, and no mark they do not wear", async ({ page }) => {
  await page.goto("/profile")
  await signInAs(page, "Olle Ohlsson")

  const card = page.locator(".profile-screen")
  await expect(card.getByText("Olle Ohlsson")).toBeVisible()
  await expect(card.locator(".unit-avatar")).toHaveCount(0)
  await expect(card.getByText("Deltagare")).toBeVisible()
  await expect(page.getByRole("button", { name: "Logga ut" })).toBeVisible()
})
