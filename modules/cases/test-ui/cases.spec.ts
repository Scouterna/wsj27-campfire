import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"

// The cases section, walked as the health team uses it: the open cases and the closed
// ones behind their segment, the list narrowed and searched, a case opened about a
// person, notes added, the case closed and reopened – and, for a management function
// outside the health team, no section at all, with its address answering exactly as one
// that matches nothing.
//
// Every walk shares one mock, whose cases live as long as it does, so a walk never
// counts the cases and finds its own by a title nobody else writes.

/**
 * The sign-in screen's one action, and the picker's way back into the application.
 * @param page The page standing on the sign-in screen.
 * @param persona The persona to pick, by the name the stand-in lists them under.
 */
async function signInAs(page: Page, persona: string): Promise<void> {
  await page.getByRole("button", { name: "Logga in med ScoutID" }).click()
  await page.getByRole("link", { name: persona }).click()
}

let titles = 0

/**
 * A case title no other walk writes, in this run or an earlier one against the same
 * mock.
 * @param testInfo The running test, whose worker keeps parallel walks apart.
 * @returns The title.
 */
function uniqueTitle(testInfo: TestInfo): string {
  titles += 1
  return `Uppföljning ${String(testInfo.workerIndex)}-${String(titles)}-${String(Date.now())}`
}

/**
 * Opens a case through the form, from the section's list to the case it lands on.
 * @param page The page, signed in as someone in the health team.
 * @param person The seed participant the case is about, by full name.
 * @param title The case's title.
 */
async function openCase(page: Page, person: string, title: string): Promise<void> {
  await page.goto("/cases")
  await page.getByRole("link", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Nytt ärende" })).toBeVisible()

  const search = page.getByRole("textbox", { name: "Vem gäller det?" })
  await search.fill(person)
  await page.getByRole("button", { name: person }).click()
  // Chosen, the person stands alone with a way to choose again, and the search is gone.
  await expect(page.getByRole("button", { name: `Byt från ${person}` })).toBeFocused()
  await expect(search).toHaveCount(0)

  const submit = page.getByRole("button", { name: "Skapa ärende" })
  await expect(submit).toBeDisabled()
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(page).toHaveURL(/\/cases\/\d+$/u)
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
}

/**
 * The entries on the case's timeline, newest first.
 * @param page The page, standing on a case.
 * @returns The entries.
 */
function timeline(page: Page): Locator {
  return page.getByRole("list", { name: "Anteckningar" }).getByRole("listitem")
}

test("shows the health team the open cases, and the closed ones on request", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Ärenden" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(page).toHaveTitle("Ärenden – Campfire")

  // The mock seeds open cases and a closed one, and only the open ones show at first.
  await expect(page.getByRole("button", { name: "Öppna", pressed: true })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Öppna ärenden" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Avslutade" })).toHaveCount(0)

  await page.getByRole("button", { name: "Avslutade", pressed: false }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Avslutade" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Öppna ärenden" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Ivar Forsberg" })).toBeVisible()

  // "Mina" keeps the cases the reader opened – every case the mock holds is Helena's, so
  // the open ones stay – and the search narrows them by who they are about.
  await page.getByRole("button", { name: "Mina", pressed: false }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Öppna ärenden" })).toBeVisible()
  const search = page.getByRole("searchbox", { name: "Sök ärenden" })
  await search.fill("Molly")
  await expect(page.getByRole("link", { name: "Molly Sundqvist" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Ester Dahl" })).toHaveCount(0)
  await search.fill("Ingen heter så")
  await expect(page.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
})

test("opens a case about a person with nothing but a title", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")

  const title = uniqueTitle(testInfo)
  await openCase(page, "Molly Sundqvist", title)

  // The case says who it is about, and its timeline holds the one moment it has had –
  // being opened.
  await expect(page).toHaveTitle(`${title} – Campfire`)
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
  const entries = timeline(page)
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Helena Hägg skapade ärendet.")

  // The overflow menu leads to the person, and back from there returns to the case.
  await page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await page.getByRole("menuitem", { name: "Visa deltagaren" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await page.getByRole("button", { name: title }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()

  // The form was replaced by the case, so back leads to the list – which now holds the
  // case, named by who it is about and its title.
  await page.goBack()
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Molly Sundqvist" }).filter({ hasText: title }),
  ).toBeVisible()
})

test("adds a note to an open case, newest first", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, "Molly Sundqvist", uniqueTitle(testInfo))

  const add = page.getByRole("button", { name: "Lägg till anteckning" })
  const field = page.getByRole("textbox", { name: "Ny anteckning" })
  await expect(add).toBeDisabled()
  await field.fill("Första besöket.")
  await add.click()
  await expect(field).toHaveValue("")
  await field.fill("Bättre i dag.")
  await add.click()

  // The newest note leads, signed by the reader as theirs, and the field is ready for
  // the next.
  const entries = timeline(page)
  await expect(entries).toHaveCount(3)
  await expect(entries.first()).toContainText("Bättre i dag.")
  await expect(entries.first()).toContainText("Helena Hägg (du)")
  await expect(entries.nth(1)).toContainText("Första besöket.")
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toHaveValue("")
})

test("closes a case once asked, and reopens it", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, "Molly Sundqvist", uniqueTitle(testInfo))

  const close = page.getByRole("button", { name: "Avsluta", exact: true }).filter({ visible: true })
  const reopen = page.getByRole("button", { name: "Återöppna" }).filter({ visible: true })

  // Closing asks first, and stepping back leaves the case open.
  await close.click()
  const dialog = page.getByRole("dialog", { name: "Avsluta ärendet?" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Avbryt" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toBeVisible()

  // Going ahead closes it: no notes are taken, the closing leads the timeline, and the
  // way back replaces the way out.
  await close.click()
  await dialog.getByRole("button", { name: "Avsluta ärendet" }).click()
  await expect(reopen).toBeVisible()
  await expect(close).toHaveCount(0)
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toHaveCount(0)
  await expect(timeline(page).first()).toContainText("Helena Hägg avslutade ärendet.")

  await reopen.click()
  await expect(close).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toBeVisible()
  await expect(timeline(page).filter({ hasText: "Ärendet avslutades" })).toHaveCount(0)
})

/**
 * Opens the units reveal before the page loads, since a person's own screen stands
 * behind it.
 * @param page The page, before its first navigation.
 */
async function openUnitsReveal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("campfire-reveal", JSON.stringify(["units"]))
  })
}

// Molly Sundqvist, whom the mock seeds an open case about.
const molly = "1300140"

test("offers the health team a person's cases from their own screen", async ({
  page,
}, testInfo) => {
  await openUnitsReveal(page)
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await page.goto(`/participants/${molly}`)
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()

  // Her cases, under a card saying who they are about – and back to her again.
  const menu = page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true })
  await menu.click()
  await page.getByRole("menuitem", { name: "Visa ärenden" }).click()
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
  // Her rows lead with the title, since the card already says who – the mock's fever
  // case about her among them.
  await expect(page.getByRole("link", { name: /^Feber/u })).toBeVisible()
  await page.getByRole("button", { name: "Molly Sundqvist" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()

  // Canceling a new case goes back to her rather than onward, and leaves no form
  // behind to go back to.
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Nytt ärende" })).toBeVisible()
  await page.getByRole("button", { name: "Avbryt" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/\/cases\/new/u)
  await page.goForward()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()

  // A new case about her starts with her chosen, so a title is all it takes.
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("button", { name: "Byt från Molly Sundqvist" })).toBeVisible()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
})

test("offers no cases on a person's screen outside the health team", async ({ page }) => {
  await openUnitsReveal(page)
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")
  await page.goto(`/participants/${molly}`)

  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Fler åtgärder" })).toHaveCount(0)
})

test("hides the section from a management function outside the health team", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")

  await expect(page.locator(".sidemenu").getByRole("link", { name: "Hem" })).toBeVisible()
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Ärenden" })).toHaveCount(0)

  // Her opening the section's address answers exactly as an address that matches
  // nothing – same title, same heading, same body, no section marked.
  await page.goto("/cases")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page).toHaveTitle("Sidan finns inte – Campfire")
  const gatedBody = await page.locator("main").innerText()

  await page.goto("/nagon/annan/plats")
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page).toHaveTitle("Sidan finns inte – Campfire")
  expect(await page.locator("main").innerText()).toBe(gatedBody)
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0)
})
