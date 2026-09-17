import { expect, test, type Page } from "@playwright/test"

// Home is the one section everyone has, so its walk carries the chrome-wide claims:
// the shared layout at every width, the document title, the menus and the marked
// section, the reselect behavior, the outline column, the not-found page, and the
// profile control as the one way out. The participants section's role gating is the
// participants module's walk.

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
  await signInAs(page, "Lars Lindberg")

  // The page's one h1 is the heading's, not the bar's – the bar carries a copy of the
  // title that condenses into view and is hidden from assistive technology.
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  await expect(page).toHaveTitle("Välkommen – Campfire")
  await expect(page.getByText("Sidan kommer snart.").first()).toBeVisible()

  // Desktop: the side menu with the current section marked, no tab bar – and at this
  // width the outline column beside the content, with the page's title as its single
  // entry because the greeting has no headings.
  const menu = page.locator(".sidemenu")
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("link", { name: "Hem" })).toHaveAttribute("aria-current", "page")
  await expect(page.locator(".tabstrip")).toBeHidden()
  await expect(page.locator(".outline").getByRole("button", { name: "Välkommen" })).toBeVisible()
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
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  const outline = page.locator(".outline")
  // With no headings the column shows the page's own title, so it never sits empty.
  await expect(outline.getByRole("button")).toHaveText(["Välkommen"])

  await giveThePageSections(page, ["Resan", "Avdelningen", "Packning"])

  // Read from the page as rendered – no module declared any of this.
  await expect(outline.getByRole("button")).toHaveText(["Resan", "Avdelningen", "Packning"])

  // Choosing an entry scrolls the content to that section, and the outline marks the
  // section being read.
  await outline.getByRole("button", { name: "Packning" }).click()
  await expect.poll(async () => scrollOf(page)).toBeGreaterThan(0)
  await expect(outline.getByRole("button", { name: "Packning" })).toHaveAttribute(
    "aria-current",
    "true",
  )
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
