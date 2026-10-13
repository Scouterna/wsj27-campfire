import { expect, test, type Page } from "@playwright/test"

// The handbook, walked as the people who read it: a leader finding the chapter that
// changed and reading it through, searching the whole handbook and landing on the
// passage, the contingent management opening the editor from the chapter they are on,
// printing the whole handbook, an address no chapter holds, and – for a person outside
// the contingent – no handbook at all. The mock serves a short seeded handbook in the
// CMS's own shape.

// When this browser last showed each chapter, so what counts as news does not depend on
// the day the walk runs: the first chapter was last read long before its note, the
// second long after its.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "campfire-handbook-read",
      JSON.stringify({ "1": "2026-01-01T00:00:00.000Z", "2": "2099-01-01T00:00:00.000Z" }),
    )
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
 * Opens the handbook from the side menu, as a reader on a desktop does.
 * @param page The signed-in page.
 */
async function openHandbook(page: Page): Promise<void> {
  await page.locator(".sidemenu").getByRole("link", { name: "Handbok" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Handbok" })).toBeVisible()
}

test("lists the chapters in reading order, marking the one that changed", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await openHandbook(page)
  await expect(page).toHaveTitle("Handbok – Campfire")

  // The CMS stores the pages out of order; the contents number the chapters as they
  // are read, each summarized by the pages in it.
  const chapters = page.locator("main a.row")
  await expect(chapters).toHaveCount(2)
  await expect(chapters.nth(0)).toContainText("01")
  await expect(chapters.nth(0)).toContainText("Välkommen")
  await expect(chapters.nth(0)).toContainText("Vad är handboken? · Kontaktinformation")
  await expect(chapters.nth(1)).toContainText("02")
  await expect(chapters.nth(1)).toContainText("Resa")

  await expect(chapters.nth(0)).toContainText("Uppdaterad")
  await expect(chapters.nth(1)).not.toContainText("Uppdaterad")
  await expect(page.getByText(/Hela handboken är nedladdad/u)).toBeVisible()

  // A leader cannot edit, so the menu offers printing and nothing more.
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem")).toHaveText(["Skriv ut handboken"])
})

test("reads a chapter whole, with what changed, and carries on", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await openHandbook(page)
  await page.locator("main a.row").filter({ hasText: "Välkommen" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  const main = page.locator("main")

  const news = page.getByRole("complementary", { name: "Ändringar" })
  await expect(news).toContainText("Uppdaterat 23 september")
  await expect(news).toContainText("1 ändring sedan du läste kapitlet")
  await expect(news.getByRole("listitem")).toHaveText(["Ny adress till avdelningssupporten."])

  // The outline beside it is the whole handbook, the pages nested under their chapters,
  // with the chapter being read marked.
  const outline = page.locator(".outline-items button")
  await expect(outline).toHaveText([
    "Välkommen",
    "Vad är handboken?",
    "Kontaktinformation",
    "Resa",
    "Resan till WSJ",
    "Håll kontakten under resan",
  ])
  await expect(outline.nth(1)).toHaveClass(/outline-nested/u)

  // Every page is a card, its title the card's heading.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Vad är handboken?",
    "Kontaktinformation",
  ])
  await expect(main.getByRole("link", { name: "wsj.units@scouterna.se" })).toHaveAttribute(
    "href",
    "mailto:wsj.units@scouterna.se",
  )

  await page
    .getByRole("navigation", { name: "Andra kapitel" })
    .getByRole("link", { name: /02 · Resa/u })
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await expect(page.getByRole("complementary", { name: "Ändringar" })).toHaveCount(0)

  // A page's own headings sit one level under its title, and a set-apart passage is
  // drawn as a reminder.
  await expect(main.getByRole("heading", { level: 2, name: "Resan till WSJ" })).toBeVisible()
  await expect(main.getByRole("heading", { level: 3, name: "Innan ni åker" })).toBeVisible()
  await expect(main.getByRole("heading", { level: 4, name: "Om något händer" })).toBeVisible()
  await expect(main.locator(".richtext-reminder")).toHaveText("Ring alltid 112 först.")

  // A nested list hangs under the entry before it rather than drawing an empty one.
  const steps = main.locator("ol").first()
  await expect(steps.locator(":scope > li")).toHaveCount(2)
  await expect(steps.locator(":scope > li").first().locator("ul > li")).toHaveText([
    "Sovsäck",
    "Liggunderlag",
  ])
  await expect(main.getByRole("columnheader", { name: "Kanal" })).toBeVisible()
  await expect(main.getByRole("link", { name: "jamboreens webbplats" })).toHaveAttribute(
    "target",
    "_blank",
  )

  // The last chapter leads only back.
  const onward = page.getByRole("navigation", { name: "Andra kapitel" })
  await expect(onward.getByRole("link")).toHaveCount(1)
  await expect(onward.getByRole("link")).toContainText("01 · Välkommen")
})

test("finds a text anywhere in the handbook and opens its passage", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await openHandbook(page)

  const field = page.getByRole("searchbox", { name: "Sök i handboken" })
  await field.fill("discord")
  const hits = page.getByRole("list", { name: "Träffar" }).getByRole("link")
  await expect(hits).toHaveCount(2)
  await expect(hits.first()).toContainText("Kapitel 02 · Resa")
  await expect(hits.first().locator("mark")).toHaveText("Discord")

  // The search is in the address, so it survives a reload.
  await expect(page).toHaveURL(/\?q=discord$/u)
  await page.reload()
  await expect(field).toHaveValue("discord")

  await hits.first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await expect(page).toHaveURL(/\/handbook\/resa#hall-kontakten-under-resan$/u)
  await expect(
    page.getByRole("heading", { level: 2, name: "Håll kontakten under resan" }),
  ).toBeInViewport()
})

test("says so when nothing matches the search", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await openHandbook(page)

  await page.getByRole("searchbox", { name: "Sök i handboken" }).fill("zebra")
  await expect(page.getByRole("status")).toHaveText("Inget i handboken matchar ”zebra”.")
})

test("opens the CMS's editor on the chapter the management is on", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)
  await page.locator("main a.row").filter({ hasText: "Resa" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()

  // The mock has no editor, so the address the new tab opens is the whole proof.
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem")).toHaveText([
    "Skriv ut kapitlet",
    "Skriv ut hela handboken",
    "Redigera kapitlet",
  ])
  const opened = page.waitForEvent("popup")
  await page.getByRole("menuitem", { name: "Redigera kapitlet" }).click()
  const editor = await opened
  await expect(editor).toHaveURL(
    /\/_services\/cms\/admin\/collections\/info-page\?where%5Bchapter%5D%5Bequals%5D=2$/u,
  )
})

test("opens a page's chapter at the page, from an address naming the page", async ({ page }) => {
  await page.goto("/handbook/kontaktinformation")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Kontaktinformation" })).toBeVisible()
})

test("says so when the address names no chapter", async ({ page }) => {
  await page.goto("/handbook/saknas")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Kapitlet finns inte i handboken.")
})

test("offers no handbook to a person outside the contingent", async ({ page }) => {
  await page.goto("/handbook")
  await signInAs(page, "Olle Ohlsson")

  await expect(page.locator(".sidemenu").getByRole("link", { name: "Handbok" })).toHaveCount(0)
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
})

test("prints the whole handbook, and nothing of the screen", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await openHandbook(page)

  // The menu offers paper in a browser, whose own dialog saves a PDF too.
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem", { name: "Skriv ut handboken" })).toBeVisible()
  await page.keyboard.press("Escape")

  await expect(page.locator(".printed-handbook")).toBeHidden()
  await page.emulateMedia({ media: "print" })
  const printed = page.locator(".printed-handbook")
  await expect(printed).toBeVisible()
  await expect(page.locator(".sidemenu")).toBeHidden()
  await expect(printed.getByRole("heading", { level: 1, name: "Handboken" })).toBeVisible()
  await expect(printed.locator(".printed-chapter > h1")).toHaveText(["Välkommen", "Resa"])
  await expect(printed.getByRole("heading", { level: 2, name: "Ändringslogg" })).toBeVisible()
})
