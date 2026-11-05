import { expect, test, type Page } from "@playwright/test"

// What a person needs, walked as the people who read it: a leader opening a scout's care
// from the list and from the home screen without leaving either, and the management and
// the health team, whose lists carry no care however much of the contingent they read.

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
 * Opens the list of the signed-in leader's own unit, narrowed to one person, since the
 * list is virtual and draws only the rows near the viewport.
 * @param page The signed-in page.
 * @param name Who to narrow to.
 */
async function findInUnit(page: Page, name: string): Promise<void> {
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill(name)
  // One row, whether the unit reads as one list or by patrol.
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1)
  // The address follows the field a moment later, and a walk compares against it.
  await expect(page).toHaveURL(/[?&]q=/u)
}

test("opens a scout's care from the list without leaving it", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await findInUnit(page, "Molly Sundqvist")
  const url = page.url()

  const mark = page.getByRole("button", { name: /^Molly Sundqvist har /u })
  await mark.click()

  const sheet = page.getByRole("dialog", { name: "Molly Sundqvist" })
  await expect(sheet).toContainText("Nötter")
  await expect(sheet).toContainText("anafylaxi")
  // She answered that she eats no special diet, and the sheet carries no all-clears.
  await expect(sheet).not.toContainText("Ingen specialkost")
  expect(page.url()).toBe(url)

  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await expect(mark).toBeFocused()
  expect(page.url()).toBe(url)
})

test("leaves for the person from the row, and from the sheet's own way onward", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await findInUnit(page, "Molly Sundqvist")

  await page.getByRole("link", { name: /^Molly Sundqvist/u }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await page.goBack()

  await page.getByRole("button", { name: /^Molly Sundqvist har /u }).click()
  await page.getByRole("link", { name: "Visa allt om Molly" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("shows a food allergy ticked only as Övriga from the list", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await findInUnit(page, "Ines Roos")

  await page.getByRole("button", { name: /^Ines Roos har /u }).click()

  const sheet = page.getByRole("dialog", { name: "Ines Roos" })
  await expect(sheet).toContainText("Övriga")
  await expect(sheet).toContainText("Kiwi")
  // The questions she left unanswered are the person's page's to say, not the sheet's.
  await expect(sheet).not.toContainText("ej besvarad")
})

test("opens a scout's care from the home screen without leaving it", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")

  await page.getByRole("button", { name: /^Molly Sundqvist har /u }).click()

  const sheet = page.getByRole("dialog", { name: "Molly Sundqvist" })
  await expect(sheet).toContainText("anafylaxi")
  await expect(page).toHaveURL(/\/$/u)
  await sheet.getByRole("button", { name: "Stäng" }).click()
  await expect(sheet).toBeHidden()
})

test("says so when the care could not be read, and claims nothing", async ({ page }) => {
  await page.route("**/participants/troopinfo/2?infolevel=full", (route) => route.abort())
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()

  await expect(page.getByText("Hälsouppgifterna kunde inte hämtas")).toBeVisible()
  await expect(page.getByRole("button", { name: /Visa hälsa och kost\.$/u })).toHaveCount(0)
})

for (const persona of ["Anna Almgren", "Helena Hägg"]) {
  test(`keeps the care off ${persona}'s list, and asks for no unit's records`, async ({ page }) => {
    let hasAsked = false
    page.on("request", (request) => {
      hasAsked ||= /troopinfo\/\d+\?infolevel=full/u.test(request.url())
    })
    await page.goto("/")
    await signInAs(page, persona)
    await page.locator(".sidemenu").getByRole("link", { name: "Deltagare" }).click()

    await expect(page.getByRole("list", { name: "Deltagare" })).toBeVisible()
    // Settled first, because a read of a unit would go out only once the list is drawn.
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("button", { name: /Visa hälsa och kost\.$/u })).toHaveCount(0)
    expect(hasAsked).toBe(false)
  })
}
