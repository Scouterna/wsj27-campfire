import { expect, test, type Locator, type Page } from "@playwright/test"

// A unit's diets and food allergies, walked as the people who read them: a leader opening
// their own unit's from the menu, reading one person's allergy in place and coming back to
// it from the person's page, the health team choosing any unit, and a management member
// without a health grant finding no such section.

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
 * One card of the overview, by its title.
 * @param page The page showing the overview.
 * @param title The card's title.
 * @returns The card, its title included.
 */
function card(page: Page, title: string): Locator {
  return page
    .locator(".card-section")
    .filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })
}

test("opens a leader's own unit, and returns from a person to the row left open", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await page.locator(".sidemenu").getByRole("link", { name: "Kost" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Kost och allergier" })).toBeVisible()
  await expect(page).toHaveURL(/\/food$/u)
  await expect(page.getByText("Avdelning 1", { exact: true })).toBeVisible()

  // The service sends a leader no leader's answers, their own included.
  await expect(
    page.getByText("2 personer visas inte, eftersom deras svar inte är dina att läsa."),
  ).toBeVisible()

  // Nuts graded by two at two grades, the highest first.
  const nuts = card(page, "Nötter")
  await expect(nuts.locator(".card-aside")).toHaveText("2 personer")
  await expect(nuts.getByText("1 med 5 av 5, 1 med 3 av 5")).toBeVisible()
  const rows = nuts.getByRole("button")
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText("Ester Dahl")
  await expect(rows.first()).toContainText("5 av 5")
  await expect(rows.first()).toContainText("Även gluten, ägg, vegetarian")
  await expect(rows.nth(1)).toContainText("Ivar Forsberg")

  // A food allergy declared without a grade is not lost, with or without what was written.
  const ungraded = card(page, "Matallergi utan grad")
  await expect(ungraded.getByRole("button", { name: /Astrid Forsberg/u })).toBeVisible()
  await expect(ungraded.getByRole("button", { name: /Otto Lind/u })).toBeVisible()

  // The diets under the allergens, a tie in the registration's order.
  await expect(page.getByRole("heading", { level: 2, name: "Specialkost" })).toBeVisible()
  const diet = card(page, "Annat")
  await diet.getByRole("button", { name: /Edvin Malm/u }).click()
  await expect(diet.getByText("Äter inte fläskkött.")).toBeVisible()

  // Ester's row in Nötter opens on its own – her row in Ägg stays closed.
  const ester = rows.first()
  await ester.click()
  await expect(ester).toHaveAttribute("aria-expanded", "true")
  await expect(card(page, "Ägg").getByRole("button", { name: /Ester Dahl/u })).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  await expect(nuts.getByText(/Nötter ger anafylaxi/u)).toBeVisible()

  await nuts.getByRole("link", { name: "Visa allt om Ester" }).click()
  await expect(page).toHaveTitle("Ester Dahl – Campfire")

  await page.goBack()
  await expect(page.getByRole("heading", { level: 1, name: "Kost och allergier" })).toBeVisible()
  await expect(card(page, "Nötter").getByRole("button").first()).toHaveAttribute(
    "aria-expanded",
    "true",
  )
  await expect(card(page, "Annat").getByRole("button", { name: /Edvin Malm/u })).toHaveAttribute(
    "aria-expanded",
    "true",
  )

  // A row without a description says so.
  const astrid = card(page, "Matallergi utan grad").getByRole("button", {
    name: /Astrid Forsberg/u,
  })
  await astrid.click()
  await expect(
    card(page, "Matallergi utan grad").getByText("Ingen beskrivning ifylld."),
  ).toBeVisible()
})

test("lets the health team choose any unit, its leaders' answers included", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await page.locator(".sidemenu").getByRole("link", { name: "Kost" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Kost och allergier" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Avdelning 2/u })).toBeVisible()

  const fullAsk = page.waitForRequest((request) =>
    request.url().includes("/participants/troopinfo/1?infolevel=full"),
  )
  await page.getByRole("link", { name: /Avdelning 1/u }).click()
  await fullAsk

  await expect(page).toHaveURL(/\/food\/1$/u)
  await expect(card(page, "Övriga").getByRole("button", { name: /Lars Lindberg/u })).toBeVisible()
  await expect(page.getByText(/visas inte/u)).toHaveCount(0)
})

test("offers a management member without a health grant no such section", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Stina Strand")
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Deltagare" })).toBeVisible()
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Kost" })).toHaveCount(0)

  const asked: string[] = []
  page.on("request", (request) => {
    if (request.url().includes("infolevel=full")) {
      asked.push(request.url())
    }
  })
  await page.goto("/food/1")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  expect(asked).toEqual([])
})
