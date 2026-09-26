import { expect, test, type BrowserContext, type Page } from "@playwright/test"

// What proves somebody is signed in is the chrome around the start screen – the profile
// control naming them.
//
// The walks share one mock, and every session in it lives in cookies each test's own
// browser context keeps, so signing in or out in one walk never touches another's. The
// walks that end a session do it the same way – by clearing their own context's cookies
// – rather than through `/__mock__/reset`, which forgets every context's ScoutID session
// at once and would end a walk running beside them in another module's project.

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
 * Clears cookies from one walk's own browser context, each name asserted present first
 * – so a drifted name could not let a walk pass without proving anything.
 * @param context The walk's browser context.
 * @param names The cookies to clear.
 */
async function clearCookies(context: BrowserContext, names: readonly string[]): Promise<void> {
  const cookies = await context.cookies()
  const present = cookies.map((cookie) => cookie.name)
  for (const name of names) {
    expect(present).toContain(name)
    await context.clearCookies({ name })
  }
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

  // Only the short-lived access token goes, and the refresh cookie stays, so the one
  // refresh the session's ask runs recovers it without the visitor noticing. The name
  // is asserted first, because were it to drift from the service's, clearing would
  // quietly remove nothing and this walk would pass without proving the recovery.
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

  // The profile control leads to the profile page and ends nothing on the way. The page
  // arrives signed in, cross-faded in as a start of its own, and is a detail of no
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

test("returns to sign-in in place when the session ends under a live page, and forgets the cache", async ({
  context,
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()

  // Opened in-app, so the list of participants is read and cached before the session ends.
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // Ends the session in this context alone. The access token goes, standing in for its
  // expiry, the refresh token goes, so the one refresh is refused, and the stand-in's own
  // session goes, so signing in again means picking somebody.
  await clearCookies(context, [
    "mock-scoutid_session",
    "wsj27-auth_access-token",
    "wsj27-auth_refresh-token",
  ])

  // In-app to a person nothing has cached, so the read reaches the network and is
  // refused – the one path this walk exists to prove.
  await page.getByRole("link", { name: /^Ester Dahl/ }).click()

  await expectSignInScreen(page)
  await expect(page).toHaveURL(/\/participants\/1300035$/)
  await expect(page.getByText("Personen kunde inte visas.")).toHaveCount(0)

  // The stand-in's own session ended too, so it asks who is signing in rather than
  // waving Lars back through.
  await signInAs(page, "Lars Lindberg")

  // Back at the address the session ended at, not the front door.
  await expect(page).toHaveURL(/\/participants\/1300035$/)
  await expect(page).toHaveTitle("Ester Dahl – Campfire")

  // A cached list is drawn at once while the fresh read is still out, so holding that
  // read shows which it is. The screen waiting for its first answer proves the cache
  // was forgotten along with the session, not merely that the screen still works.
  const held = Promise.withResolvers<undefined>()
  await page.route("**/participants/troopinfo/1*", async (route) => {
    await held.promise
    await route.continue()
  })
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await expect(page.getByRole("status")).toHaveText("Hämtar deltagarna …")
  held.resolve(undefined)
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
})

test("carries a read on without a sign-in when only the access token is stale", async ({
  context,
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // Only the access token goes, and the refresh cookie stays, so the one refresh the
  // session runs underneath a refused read recovers it without a sign-in.
  await clearCookies(context, ["wsj27-auth_access-token"])

  const refreshed = page.waitForRequest((request) => request.url().includes("/api/auth/refresh"))
  await page.getByRole("link", { name: /^Ester Dahl/ }).click()

  await expect(page).toHaveTitle("Ester Dahl – Campfire")
  await refreshed
  await expect(page.getByText("Personen kunde inte visas.")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Logga in med ScoutID" })).toHaveCount(0)
})

test("notices on its own that the session expired, with nobody touching the page", async ({
  context,
  page,
}) => {
  // Installed before the first navigation, so every timer the application sets from
  // boot on – the expiry watcher's own included – is a fake one the clock controls.
  await page.clock.install()

  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()

  // The clock never expires a real cookie, so the two the browser would drop at expiry
  // are cleared by hand, and the refresh token with them, so the refresh the watcher
  // eventually triggers is refused – but nothing asks for one until the watcher notices.
  await clearCookies(context, [
    "wsj27-auth_access-token",
    "wsj27-auth_expires-at",
    "wsj27-auth_refresh-token",
  ])

  // Five minutes past the expiry, plus the watcher's twenty-second grace, with margin
  // – and nobody touches the page in between.
  await page.clock.fastForward("05:30")

  await expectSignInScreen(page)
  await expect(page).toHaveURL(/\/$/)
})

test("keeps what it shows when the expiry passes with no signal", async ({ context, page }) => {
  await page.clock.install()

  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // At camp a token lapses every five minutes while the keep-alive, and the watcher's
  // own ask, cannot reach the service either.
  await context.setOffline(true)

  await clearCookies(context, ["wsj27-auth_access-token", "wsj27-auth_expires-at"])

  // Awaited before the assertions, so they judge the screen after the watcher's ask
  // failed rather than before it was made – when they would pass without proving anything.
  const asked = page.waitForEvent("requestfailed", (request) =>
    request.url().includes("/api/auth/user"),
  )
  await page.clock.fastForward("05:30")
  await asked

  // An ask that cannot reach the service ends nothing – `unreachable` records no
  // change and notifies nobody, so the screen a reader left open keeps showing it.
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
  await expect(page.getByRole("link", { name: "Profil för Lars Lindberg" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Logga in med ScoutID" })).toHaveCount(0)
})
