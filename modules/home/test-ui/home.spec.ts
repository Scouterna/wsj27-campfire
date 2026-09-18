import { expect, test, type Page } from "@playwright/test"

// The reveal file itself rather than the ui package: the package surface pulls
// component stylesheets along, which the test runner cannot swallow.
// eslint-disable-next-line import-x/no-relative-packages -- see above
import { unitsReveal } from "../../../libraries/ui/src/foundations/reveal/reveals"
import { closedMessagesKey, messages } from "../src/model/messages"

// Home is the one section everyone has, so its walk carries the chrome-wide claims:
// the shared layout at every width, the document title, the menus and the marked
// section, the reselect behavior, the outline column, the not-found page, and the
// profile control as the one way out. The participants section's role gating is the
// participants module's walk.

// The reveal is timed, and until its moment the whole participants surface is behind
// the curtain. These walks are about what the surface does once it is open, so each
// page opens with the development bypass set – exactly as a developer works.
//
// And every message starts closed. An unread message is a section of its own on the
// start screen, and these walks are about the chrome around a bare one – the outline's
// no-headings fallback most of all. The messages have their own walk beside this one.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ closed, key }) => {
      localStorage.setItem("campfire-reveal", JSON.stringify(["units"]))
      localStorage.setItem(key, JSON.stringify(closed))
    },
    { closed: messages.map((message) => message.id), key: closedMessagesKey },
  )
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
 * Give the page sections and enough height to scroll, as a screen with real content will.
 *
 * Every screen in this build is a one-line placeholder, so there is nothing to scroll and
 * no heading to list – which would leave the outline's whole job and the reselect scroll
 * asserted by tests that cannot fail. The outline reads the document as rendered rather
 * than a table a module declared, so headings put here exercise exactly the code a real
 * page will, without a placeholder screen having to invent content it does not have yet.
 * @param page The page showing a signed-in screen.
 * @param headings What to call the sections.
 */
async function giveThePageSections(page: Page, headings: readonly string[]): Promise<void> {
  await page.evaluate((names) => {
    const content = document.querySelector("main .content")
    if (content === null) {
      throw new Error("no content column to fill")
    }
    for (const name of names) {
      const heading = document.createElement("h2")
      heading.textContent = name
      const filler = document.createElement("p")
      filler.style.height = "1200px"
      content.append(heading, filler)
    }
  }, headings)
}

/**
 * Whatever scrolls at this width, as a number the assertions can poll.
 * @param page The page to measure.
 * @returns How far the content column has scrolled.
 */
async function scrollOf(page: Page): Promise<number> {
  return page.locator(".page").evaluate((element) => element.scrollTop)
}

test("wraps the start screen in the shared layout at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  // Anna rather than a leader: her start screen carries the countdown and nothing
  // else, so the outline below lists exactly the one heading.
  await signInAs(page, "Anna Almgren")

  // The page's one h1 is the heading's, not the bar's – the bar carries a copy of the
  // title that condenses into view and is hidden from assistive technology.
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  await expect(page).toHaveTitle("Välkommen – Campfire")

  // Desktop: the side menu with the current section marked, no tab bar – and at this
  // width the outline column beside the content, reading the countdown card's heading
  // off the page as rendered.
  const menu = page.locator(".sidemenu")
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("link", { name: "Hem" })).toHaveAttribute("aria-current", "page")
  await expect(page.locator(".tabstrip")).toBeHidden()
  await expect(page.locator(".outline").getByRole("button", { name: "Resan" })).toBeVisible()
})

test("keeps the side menu but drops the outline below the widest width", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  // The middle band: wide enough for the side menu, too narrow for the outline, which
  // exists at the widest widths and nowhere narrower.
  await expect(page.locator(".sidemenu")).toBeVisible()
  await expect(page.locator(".tabstrip")).toBeHidden()
  await expect(page.locator(".outline")).toBeHidden()
})

test("swaps the side menu for the tab bar at a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  const strip = page.locator(".tabstrip")
  await expect(strip).toBeVisible()
  await expect(strip.getByRole("link", { name: "Hem" })).toHaveAttribute("aria-current", "page")
  await expect(page.locator(".sidemenu")).toBeHidden()

  // No outline this narrow, and the profile control sits at the bar's trailing edge
  // as the initial alone.
  await expect(page.locator(".outline")).toBeHidden()
  await expect(page.locator(".topbar .profile-compact")).toBeVisible()
})

test("reselecting the section already shown scrolls to the top instead of navigating", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  await giveThePageSections(page, ["Först", "Sedan"])
  await page.locator(".page").evaluate((element) => {
    element.scrollTo({ top: 900, behavior: "instant" })
  })
  await expect.poll(async () => scrollOf(page)).toBeGreaterThan(0)

  const before = await page.evaluate(() => history.length)
  await page.locator(".sidemenu").getByRole("link", { name: "Hem" }).click()

  // Back at the top, still home, and no new history entry – the click scrolled rather
  // than navigated.
  await expect.poll(async () => scrollOf(page)).toBe(0)
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test("lists the page's own headings in the outline, and moves between them", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  // Anna rather than a leader: a leader's start screen brings the unit widget's own
  // headings, and this walk is about the scan alone.
  await signInAs(page, "Anna Almgren")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  const outline = page.locator(".outline")
  // The countdown card's heading, read from the page as rendered.
  await expect(outline.getByRole("button")).toHaveText(["Resan"])

  await giveThePageSections(page, ["Maten", "Avdelningen", "Packning"])

  // Read from the page as rendered – no module declared any of this.
  await expect(outline.getByRole("button")).toHaveText([
    "Resan",
    "Maten",
    "Avdelningen",
    "Packning",
  ])

  // Choosing an entry scrolls the content to that section, and the outline marks the
  // section being read.
  await outline.getByRole("button", { name: "Packning" }).click()
  await expect.poll(async () => scrollOf(page)).toBeGreaterThan(0)
  await expect(outline.getByRole("button", { name: "Packning" })).toHaveAttribute(
    "aria-current",
    "true",
  )

  // With no headings at all the column shows the page's own title, so it never sits
  // empty – the not-found page is the one signed-in screen bare enough to prove it.
  await page.goto("/nagon/annan/plats")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(outline.getByRole("button")).toHaveText(["Sidan finns inte"])
})

test("lands a junk address on the not-found page, inside the layout", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  await page.goto("/nagon/annan/plats")

  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page).toHaveTitle("Sidan finns inte – Campfire")
  // Inside the same layout – the menu is there, with no section marked.
  await expect(page.locator(".sidemenu")).toBeVisible()
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0)

  // And the way home works.
  await page.getByRole("link", { name: "Till startsidan" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
})

test("shows who is signed in, and the profile control is the one way out", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The pill names the person and their role; the accessible name says it signs out.
  const pill = page.getByRole("button", { name: "Logga ut Lars Lindberg" })
  await expect(pill).toBeVisible()
  await expect(pill).toContainText("Lars Lindberg")
  await expect(pill).toContainText("Ledare · Avdelning 1")

  // Home no longer carries a sign-out control of its own. By role rather than by text:
  // the wording exists only as the pill's accessible name, so a text search would pass
  // against a screen that still had its own button.
  await expect(page.getByRole("button", { name: /^Logga ut$/ })).toHaveCount(0)

  // Pressing the pill runs the sign-out round trip, ending on the sign-in screen.
  await pill.click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Äventyret\s*börjar här/)
})

test("moves without animating where the reader prefers reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  // Emulated on the page rather than declared with `test.use`: the projects set their
  // own `use` from a device descriptor, which wins over a describe block's, so the
  // preference declared that way never reaches the browser.
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  // That the preference reached the page at all – without this the rest would pass
  // against a browser that never asked for less motion.
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  )

  // The view transitions are disarmed in a media query no script can read back, so what
  // is asserted is the same preference reaching a rule that can be: the outline's
  // marker, which slides between entries and holds still under reduced motion.
  await expect(page.locator(".outline-marker")).toHaveCSS("transition-duration", "0s")

  // And the scripted scroll, which no browser damps on our behalf, asks for none: the
  // column is already at the top when the click returns rather than easing there.
  await giveThePageSections(page, ["Först", "Sedan"])
  await page.locator(".page").evaluate((element) => {
    element.scrollTo({ top: 900, behavior: "instant" })
  })
  await page.locator(".sidemenu").getByRole("link", { name: "Hem" }).click()
  expect(await scrollOf(page)).toBe(0)
})

test("places a leader's unit on the start screen, and nobody else's", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  // The widget: the unit's identity, then the scouts and the leaders as pills – the
  // scouts' pills carrying ages, the leaders' none.
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
  await expect(page.getByText("Avdelning 1", { exact: true })).toBeVisible()
  const scout = page.getByRole("link", { name: /Ester Dahl/ })
  await expect(scout).toContainText(/\d år/)
  // The pattern, not the word: the kår under every name ends in "år" too.
  await expect(page.getByRole("link", { name: /Hanna Hellström/ })).not.toContainText(/\d år/)

  // A pill is a doorway into the person.
  await scout.click()
  await expect(page).toHaveTitle("Ester Dahl – Campfire")
})

test("gives the management's start screen no unit widget", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toHaveCount(0)
})

test("keeps everything behind the curtain until the reveal", async ({ page }) => {
  // Once the moment has passed – for real, or moved for a rehearsal – there is no
  // curtain left to walk, and the walk stands down rather than failing.
  test.skip(Date.now() >= unitsReveal.at.getTime(), "the reveal moment has passed")

  // The bypass the other walks set is taken back off, so this page stands where a
  // real leader stands before the moment.
  await page.addInitScript(() => {
    localStorage.removeItem("campfire-reveal")
  })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The start screen holds the reveal's countdown and nothing else – the journey's
  // card included waits behind the curtain – and the menus offer only home: the
  // participants section does not exist yet, for anybody.
  await expect(page.getByText("Lördag 19 september 19.30")).toBeVisible()
  await expect(page.getByText("dagar")).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toHaveCount(0)
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toHaveCount(0)
  await expect(page.locator(".sidemenu").getByRole("link")).toHaveCount(1)
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Hem" })).toBeVisible()

  // The section's address answers exactly as one that matches nothing.
  await page.goto("/participants")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
})
