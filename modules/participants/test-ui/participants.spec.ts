import { expect, test, type Page } from "@playwright/test"

// The participants section, walked as the people who use it: a leader reading their
// own unit, the contingent management searching and narrowing the whole contingent,
// opening a person and coming back to the list as it was, browsing by unit, the
// information levels the service grants, and – for a person outside the contingent –
// no section at all, with its address answering exactly as one that matches nothing.

// The reveal is timed, and until its moment the whole participants surface is behind
// the curtain. These walks are about what the surface does once it is open, so each
// page opens with the development bypass set – exactly as a developer works.
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

test("shows a leader their own unit, with the unit's own filter", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Min avdelning" })).toBeVisible()
  await expect(page).toHaveTitle("Min avdelning – Campfire")

  // The unit's eight people, and nobody from anywhere else.
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
  await expect(page.getByRole("listitem")).toHaveCount(8)
  await expect(page.getByRole("listitem").filter({ hasText: "Avdelning 2" })).toHaveCount(0)

  // A unit is searched and narrowed too – in its own vocabulary: a unit holds
  // deltagare and ledare, so IST and CMT are not offered. The way in by unit stays
  // the management's.
  await expect(page.getByRole("searchbox", { name: "Sök deltagare" })).toBeVisible()
  const filter = page.getByRole("group", { name: "Filtrera efter roll" })
  await expect(filter.getByRole("button")).toHaveCount(3)
  await expect(filter.getByRole("button", { name: "IST" })).toHaveCount(0)
  await filter.getByRole("button", { name: "Ledare", pressed: false }).click()
  await expect(page.getByRole("status")).toHaveText("2 av 8 personer")
  await expect(page.getByRole("link", { name: "Avdelningar" })).toHaveCount(0)
})

test("answers a leader's deep link straight into the section", async ({ page }) => {
  // Signed out at the deep address, the gate shows sign-in – and the round trip lands
  // back on the address that was asked for, inside the layout.
  await page.goto("/participants")
  await signInAs(page, "Lars Lindberg")

  await expect(page).toHaveURL(/\/participants(\?|$)/)
  await expect(page.getByRole("heading", { level: 1, name: "Min avdelning" })).toBeVisible()
})

test("lets the management search the contingent and narrow it by roll", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  await page.locator(".sidemenu").getByRole("link", { name: "Deltagare" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Deltagare" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("59 personer i kontingenten")

  // Searching narrows, counts what is shown, and lands in the address.
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("ström")
  await expect(page.getByRole("status")).toHaveText("2 av 59 personer")
  await expect(page).toHaveURL(/q=str%C3%B6m/)

  // A roll on top of the search: both apply, and the search survives the chip.
  await page.getByRole("button", { name: "Ledare", pressed: false }).click()
  await expect(page.getByRole("status")).toHaveText("1 av 59 personer")
  await expect(page.getByRole("button", { name: "Ledare", pressed: true })).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Sök deltagare" })).toHaveValue("ström")
  await expect(page.getByRole("listitem")).toHaveCount(1)

  // Nothing matching says so, in its own words and with a way forward, the controls
  // still in place.
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("zzz")
  await expect(page.getByText("Inga träffar", { exact: true })).toBeVisible()
  await expect(page.getByText("Prova ett annat namn")).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "Sök deltagare" })).toBeVisible()
})

test("returns from a person to the list exactly as it was left", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.locator(".sidemenu").getByRole("link", { name: "Deltagare" }).click()

  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("ström")
  await page.getByRole("button", { name: "Ledare", pressed: false }).click()
  await expect(page.getByRole("status")).toHaveText("1 av 59 personer")

  await page.getByRole("link", { name: /Hanna Hellström/ }).click()
  await expect(page).toHaveTitle("Hanna Hellström – Campfire")

  await page.goBack()
  await expect(page.getByRole("searchbox", { name: "Sök deltagare" })).toHaveValue("ström")
  await expect(page.getByRole("button", { name: "Ledare", pressed: true })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("1 av 59 personer")
  await expect(page.getByRole("link", { name: /Hanna Hellström/ })).toBeVisible()
})

test("browses the contingent by unit, down to a person", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.locator(".sidemenu").getByRole("link", { name: "Deltagare" }).click()

  await page.getByRole("link", { name: "Avdelningar" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Avdelningar" })).toBeVisible()

  // Every entry with its count – the units, then the IST and the management, so
  // everyone in the contingent is reachable through the browser.
  await expect(page.getByRole("link", { name: /Avdelning 1.*8 personer/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Avdelning 2.*40 personer/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /IST.*2 personer/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /CMT.*9 personer/ })).toBeVisible()

  await page.getByRole("link", { name: /Avdelning 2/ }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Avdelning 2" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("40 personer i avdelningen")

  await page.getByRole("link", { name: /Anders Andersson/ }).click()
  await expect(page).toHaveTitle("Anders Andersson – Campfire")
})

test("shows the health answers to the health function, at the full level", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")

  const fullAsk = page.waitForRequest((request) =>
    request.url().includes("/participants/individual/1100101?infolevel=full"),
  )
  await page.goto("/participants/1100101")
  await fullAsk

  await expect(page).toHaveTitle("Lars Lindberg – Campfire")
  await expect(page.getByRole("heading", { level: 2, name: "Kost och allergier" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Vaccinationer" })).toBeVisible()
})

test("asks at the basic level without a health grant, and renders without health", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Arvid Ask")

  const basicAsk = page.waitForRequest((request) =>
    request.url().includes("/participants/individual/1100101?infolevel=basic"),
  )
  await page.goto("/participants/1100101")
  await basicAsk

  await expect(page).toHaveTitle("Lars Lindberg – Campfire")
  await expect(page.getByRole("heading", { level: 2, name: "Profil" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Kost och allergier" })).toHaveCount(0)
  await expect(page.getByRole("heading", { level: 2, name: "Hälsa" })).toHaveCount(0)
})

test("renders a fellow leader's record with the dropped details absent", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The service drops a leader's contact answers for a fellow leader: no emergency
  // contacts, and the unsent mobile gets its designed absent state – worded exactly as
  // any other absence, with no reason given.
  await page.goto("/participants/1100402")
  await expect(page).toHaveTitle("Hanna Hellström – Campfire")
  await expect(page.getByText("Nödkontakt", { exact: false })).toHaveCount(0)
  await expect(page.getByText("Ej angiven").first()).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Hälsa" })).toHaveCount(0)
})

test("hides the section from a person outside the contingent, indistinguishably", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Olle Ohlsson")

  // No participants entry anywhere in the menus – home is his one section.
  await expect(page.locator(".sidemenu").getByRole("link")).toHaveCount(1)
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Hem" })).toBeVisible()

  // His opening the section's address answers exactly as an address that matches
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

test("gives a management function the whole section, in the management's name", async ({
  page,
}) => {
  // Pernilla holds the program function – the section is every management function's,
  // not only administration's.
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Deltagare" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Deltagare" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("59 personer i kontingenten")

  // The profile control names the management function rather than the management as a
  // whole, which is the one place a CMT member's line differs from a leader's.
  const pill = page.getByRole("button", { name: "Logga ut Pernilla Palm" })
  await expect(pill).toContainText("CMT · Program")
})
