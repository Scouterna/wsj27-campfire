import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test"
import { fileURLToPath } from "node:url"

// The cases section, walked as its readers use it: the open cases by who follows them
// up and the closed ones, each behind its segment, the list narrowed and searched, a
// case opened about a person or a unit in the kind and at the level its creator chose,
// given someone more, renamed, written on with pictures, closed, and reopened.
// Who reaches what is the service's: a private case stays with its creator, a management
// member sees no health case, a leader keeps to their own unit, and someone with no case
// type at all has no section, its address answering exactly as one that matches nothing.
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
 * @returns The title, carrying the worker, a count, and the time.
 */
function uniqueTitle(testInfo: TestInfo): string {
  titles += 1
  return `Uppföljning ${String(testInfo.workerIndex)}-${String(titles)}-${String(Date.now())}`
}

/**
 * What a case is opened as: its kind, and who sees it, each by words only its own choice
 * holds. Left out, a level stays at the form's default, and a kind is left to a reader who
 * has only one, whose form does not ask.
 */
interface Kind {
  readonly level?: string
  readonly scope?: string
}

/**
 * Opens a case through the form, from the section's list to the case it lands on.
 * @param page The page, signed in as someone who may open the kind of case.
 * @param kind What the case is opened as.
 * @param person The seed participant the case is about, by full name.
 * @param title The case's title.
 */
async function openCase(page: Page, kind: Kind, person: string, title: string): Promise<void> {
  await page.goto("/cases")
  await page.getByRole("link", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Nytt ärende" })).toBeVisible()

  if (kind.scope !== undefined) {
    await page.getByRole("radio", { name: kind.scope }).check()
  }
  if (kind.level !== undefined) {
    await page.getByRole("radio", { name: kind.level }).check()
  }

  const search = page.getByRole("textbox", { name: "Vem gäller det?" })
  await search.fill(person)
  await page.getByRole("button", { name: person }).click()
  // Chosen, the person takes the search's place, with a way to choose someone else.
  await expect(page.getByRole("button", { name: `Byt ${person}` })).toBeVisible()
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
 * A health case at the default level – the kind the health team opens most.
 */
const healthCase: Kind = { scope: "Hälsa" }

/**
 * Signs a second person in, in a browser context of their own, so a walk can compare what
 * two readers reach.
 * @param browser The browser the walk runs in.
 * @param persona The persona to pick.
 * @returns The second person's page, standing on the cases nobody follows up.
 */
async function secondReader(browser: Browser, persona: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("/")
  await signInAs(page, persona)
  await page.goto("/cases")
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await showWaiting(page)
  return page
}

// Molly Sundqvist, whom the mock seeds an open case about.
const molly = "1300140"

/**
 * A small picture, handed over as a phone's picker hands one over.
 */
const photo = fileURLToPath(new URL("utslag.png", import.meta.url))

/**
 * The entries on the case's timeline, newest first.
 * @param page The page, standing on a case.
 * @returns The entries, as list items.
 */
function timeline(page: Page): Locator {
  return page.getByRole("list", { name: "Anteckningar" }).getByRole("listitem")
}

/**
 * The way to choose who is responsible for a case: the responsible person's name, or
 * "Ingen", at the head of the case's card – the one control there that opens a panel.
 * @param access The case's card.
 * @returns The button.
 */
function responsible(access: Locator): Locator {
  return access.getByRole("group", { name: "Ansvarig" }).locator("button[aria-expanded]")
}

/**
 * Narrows the list to the open cases that wait for someone – every seeded case, and every
 * one a walk opens until it is taken on, since nobody follows them up.
 * @param page The page, standing on the cases section.
 */
async function showWaiting(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Väntar", pressed: false }).click()
  await expect(page.getByRole("list", { name: "Väntar" })).toBeVisible()
}

test("shows the health team the open cases, and the closed ones on request", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Ärenden" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(page).toHaveTitle("Ärenden – Campfire")

  // The list opens on the reader's own cases. The mock seeds open cases nobody follows up,
  // which wait, and a closed one, each behind its own segment.
  await expect(page.getByRole("button", { name: "Mina", pressed: true })).toBeVisible()
  await showWaiting(page)
  await expect(page.getByRole("list", { name: "Avslutade" })).toHaveCount(0)
  // One list needs no heading, since its segment already names it.
  await expect(page.getByRole("heading", { level: 2, name: "Väntar" })).toHaveCount(0)

  await page.getByRole("button", { name: "Avslutade", pressed: false }).click()
  await expect(page.getByRole("list", { name: "Avslutade" })).toBeVisible()
  await expect(page.getByRole("list", { name: "Väntar" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Ivar Forsberg" })).toBeVisible()

  // The search narrows the cases by who they are about – shown on Ivar, since no walk
  // writes about him, so nothing piles up above him in a mock that outlives the walks.
  const search = page.getByRole("searchbox", { name: "Sök ärenden" })
  await search.fill("Ivar")
  await expect(page.getByRole("link", { name: "Ivar Forsberg" })).toBeVisible()

  // The health team is in the management too, so the management's case about Alva shows
  // beside the health cases, saying which kind it is. Found by its title, because the
  // walks open cases of their own about Alva.
  await search.fill("Tidig hemresa")
  await showWaiting(page)
  await expect(
    page.getByRole("link", { name: /Tidig hemresa/u }).filter({ hasText: "CMT" }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: /Allergisk reaktion/u })).toHaveCount(0)
  // Karin opened it and it is not about her, so only who opened it can match her name.
  await search.fill("Kron")
  await expect(page.getByRole("link", { name: /Tidig hemresa/u })).toBeVisible()
  await search.fill("Ingen heter så")
  await expect(page.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
})

test("opens a case about a person, of a kind and seen by whom the form asked", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")

  // The health team may open a health case or a management case, and neither is chosen
  // for them; the levels appear once the kind is chosen, the default already in force.
  await page.goto("/cases/new")
  await expect(page.getByRole("radio", { name: /^Hälsa/u })).not.toBeChecked()
  await expect(page.getByRole("radio", { name: /^CMT/u })).not.toBeChecked()
  await expect(page.getByRole("radio", { name: /^Hälsoteamet/u })).toHaveCount(0)
  await page.getByRole("radio", { name: /^Hälsa/u }).check()
  await expect(page.getByRole("radio", { name: /^Hälsoteamet/u })).toBeChecked()

  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  // The case says who it is about, what kind it is and who sees it, and its timeline
  // holds the one moment it has had – being opened.
  await expect(page).toHaveTitle(`${title} – Campfire`)
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access).toContainText("Hälsa")
  await expect(access.getByRole("group", { exact: true, name: "Ser ärendet" })).toContainText(
    "Hela hälsoteamet",
  )
  const entries = timeline(page)
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Helena Hägg skapade ärendet.")

  // The overflow menu changes the case above a rule and leads to the person and to her
  // unit below it, and back from the person returns to the case.
  await page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  const menu = page.getByRole("menu")
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Byt rubrik",
    "Lägg till person",
    "Visa personen",
    "Visa avdelningen",
  ])
  await expect(menu.getByRole("separator")).toHaveCount(1)
  await expect(menu.locator(":scope > *").nth(2)).toHaveAttribute("role", "separator")
  await page.getByRole("menuitem", { name: "Visa personen" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await page.getByRole("button", { name: title }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()

  // The form was replaced by the case, so back leads to the list – which now holds the
  // case among those she opened, named by its title, who it is about and their unit, and
  // who opened it, and saying nobody follows it up. Searched for, because the walks' own
  // cases pile up in a mock that outlives them, and a list draws only the rows in view.
  await page.goBack()
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  const row = page
    .getByRole("list", { name: "Du har skapat" })
    .getByRole("link", { name: "Molly Sundqvist" })
    .filter({ hasText: title })
  await expect(row).toContainText("Molly Sundqvist · Avd 2")
  await expect(row).toContainText("Skapat av Helena Hägg")
  await expect(row).toContainText("Ingen ansvarig")
})

test("opens a case about two people, chosen one after the other", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await page.goto("/cases/new")
  await page.getByRole("radio", { name: "Hälsa" }).check()

  await page.getByRole("textbox", { name: "Vem gäller det?" }).fill("Ester Dahl")
  await page.getByRole("button", { name: /^Ester Dahl/u }).click()
  await expect(page.getByRole("button", { name: "Byt Ester Dahl" })).toBeVisible()

  // Someone more is added under her, from a search that leaves her out, and then each of
  // the two can be taken off the list.
  const adding = page.getByRole("button", { name: "Lägg till", exact: true })
  await adding.click()
  await expect(adding).toHaveAttribute("aria-expanded", "true")
  const more = page.getByRole("textbox", { name: "Lägg till person" })
  await expect(more).toBeFocused()
  // The same button puts the search away again, and brings it back.
  await adding.click()
  await expect(more).toHaveCount(0)
  await adding.click()
  await more.fill("Ester")
  await expect(page.getByText("Ingen heter så.")).toBeVisible()
  await expect(page.getByRole("button", { name: /^Ester Dahl/u })).toHaveCount(0)
  await more.fill("Ivar Forsberg")
  await page.getByRole("button", { name: /^Ivar Forsberg/u }).click()
  await expect(page.getByRole("button", { name: "Ta bort Ester Dahl" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Ta bort Ivar Forsberg" })).toBeFocused()
  // Taken off again, the one left is changed rather than taken away, and focus lands on
  // the way to add someone, which the row taken off held.
  await page.getByRole("button", { name: "Ta bort Ester Dahl" }).click()
  await expect(page.getByRole("button", { name: "Byt Ivar Forsberg" })).toBeVisible()
  await expect(adding).toBeFocused()
  await adding.click()
  await more.fill("Ester Dahl")
  await page.getByRole("button", { name: /^Ester Dahl/u }).click()
  await expect(page.getByRole("button", { name: "Ta bort Ester Dahl" })).toBeFocused()

  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  const about = page.getByRole("region", { name: "Gäller" })
  await expect(about).toContainText("Ester Dahl")
  await expect(about).toContainText("Ivar Forsberg")
})

test("adds a second person to a case from its menu, and takes them off again", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  // One person, so nothing offers to take her off.
  const about = page.getByRole("region", { name: "Gäller" })
  await expect(about.getByRole("button", { name: "Ta bort Molly Sundqvist" })).toHaveCount(0)

  // Someone more is added from the menu, on a card of their own under her.
  const menu = page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true })
  await menu.click()
  await page.getByRole("menuitem", { name: "Lägg till person" }).click()
  await page.getByRole("textbox", { name: "Lägg till person" }).fill("Ester Dahl")
  await page.getByRole("button", { name: "Ester Dahl" }).click()
  await expect(about.getByRole("region", { name: "Ester Dahl" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Lägg till person" })).toHaveCount(0)
  await expect(timeline(page).first()).toContainText("Helena Hägg lade till Ester Dahl.")

  // Both are on it, so the menu leads to each of them by name.
  await menu.click()
  await expect(page.getByRole("menuitem", { name: "Visa personen" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Visa Molly Sundqvist" })).toBeVisible()
  await page.getByRole("menuitem", { name: "Visa Ester Dahl" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Ester Dahl" })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()

  // Among Molly's own cases, the row names both, so Ester is not hidden behind her.
  await page.goto(`/cases/person/${molly}`)
  await expect(page.getByRole("link", { name: title })).toContainText(
    "Molly Sundqvist och Ester Dahl",
  )
  await page.goBack()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()

  // Taken off again, the change takes its place in the history.
  await about.getByRole("button", { name: "Ta bort Ester Dahl" }).click()
  await expect(about).not.toContainText("Ester Dahl")
  await expect(timeline(page).first()).toContainText("Helena Hägg tog bort Ester Dahl.")
})

test("opens a case about a unit as a whole", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await page.goto("/cases/new")
  await page.getByRole("radio", { name: /^Hälsa/u }).check()

  // Its number finds the unit alone, ahead of its people, who are set apart under a
  // heading of their own.
  await page.getByRole("textbox", { name: "Vem gäller det?" }).fill("1")
  await expect(page.getByRole("list", { name: "Avdelningar" }).getByRole("listitem")).toHaveCount(1)
  await expect(page.getByRole("list", { name: "Personer" })).toContainText("Ester Dahl")
  await page.getByRole("button", { name: /^Avdelning 1/u }).click()
  await expect(page.getByRole("button", { name: "Byt Avdelning 1" })).toBeVisible()

  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  const about = page.getByRole("region", { name: "Gäller" })
  await expect(about).toContainText("Avdelning 1")
  await expect(about).toContainText("Hela avdelningen")

  // The list names it by its unit, and the menu leads there – but adds nobody, since it
  // is about the unit as a whole.
  await page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await expect(page.getByRole("menuitem", { name: "Visa personen" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Lägg till person" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Visa avdelningen" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.goto("/cases")
  await showWaiting(page)
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  await expect(
    page.getByRole("link", { name: "Avdelning 1" }).filter({ hasText: title }),
  ).toBeVisible()

  // The unit's own cases hold it apart from those about its people.
  await page.goto("/cases/unit/1")
  await expect(page.getByRole("list", { name: "Hela avdelningen" })).toContainText(title)
})

test("keeps a private case from the rest of its group", async ({ browser, page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, { level: "Bara du", scope: "CMT" }, "Alva Lundgren", title)
  await expect(
    page
      .getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
      .getByRole("group", { exact: true, name: "Ser ärendet" }),
  ).toContainText("Bara du")
  const caseUrl = page.url()
  await page.goto("/cases")
  await showWaiting(page)
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  await expect(page.getByRole("link", { name: title })).toContainText("Bara du")
  // Each list says how many of the matches it holds, and one that holds none says nothing.
  const lists = page.getByRole("group", { name: "Filtrera ärenden" })
  // The count's words are read after the label, with whatever spacing the browser puts
  // between a label and the hidden words beside it.
  await expect(lists.getByRole("button", { name: /^Väntar/u })).toHaveAccessibleName(
    /^Väntar\W+1 ärende$/u,
  )
  await expect(lists.getByRole("button", { name: /^Pågår/u })).toHaveText("Pågår")

  // Pernilla is in the management too, and reaches its case about Alva – but not Helena's
  // private one, nor any health case.
  const pernilla = await secondReader(browser, "Pernilla Palm")
  const herSearch = pernilla.getByRole("searchbox", { name: "Sök ärenden" })
  await herSearch.fill("Tidig hemresa")
  await expect(pernilla.getByRole("link", { name: /Tidig hemresa/u })).toBeVisible()
  await herSearch.fill(title)
  await expect(pernilla.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
  await herSearch.fill("Feber")
  await expect(pernilla.getByText("Inga ärenden matchar sökningen.")).toBeVisible()

  // Its address shows her nothing of it, exactly as one that names no case at all.
  await pernilla.goto(caseUrl)
  await expect(pernilla.getByText("Ärendet kunde inte visas.")).toBeVisible()
  await expect(pernilla.getByRole("heading", { level: 1, name: title })).toHaveCount(0)
  await pernilla.goto("/cases/999999999")
  await expect(pernilla.getByText("Ärendet kunde inte visas.")).toBeVisible()
  await pernilla.context().close()
})

test("renames an open case", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  // Put away unchanged, focus goes back to the menu it was opened from.
  const menu = page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true })
  await menu.click()
  await page.getByRole("menuitem", { name: "Byt rubrik" }).click()
  const field = page.getByRole("textbox", { name: "Rubrik" })
  await expect(field).toBeFocused()
  await page.getByRole("button", { name: "Avbryt" }).click()
  await expect(field).toHaveCount(0)
  await expect(menu).toBeFocused()

  await menu.click()
  await page.getByRole("menuitem", { name: "Byt rubrik" }).click()
  await expect(field).toHaveValue(title)
  const save = page.getByRole("button", { name: "Spara" })
  await expect(save).toBeDisabled()

  const renamed = `${title} igen`
  await field.fill(renamed)
  await save.click()
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible()
  await expect(field).toHaveCount(0)
})

test("shares a case with someone outside its group, and takes it back", async ({
  browser,
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  // Karin leads the contingent but is not in the health team, so only sharing lets her in.
  // Only leaders and CMT are offered, and choosing her shares the case at once.
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access.getByRole("button", { name: "Hantera" })).toHaveCount(0)
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const add = page.getByRole("textbox", { name: "Ledare och CMT som inte ser ärendet" })
  await add.fill("Ester Dahl")
  await expect(
    page.getByText("Ingen ledare eller i CMT som inte ser ärendet heter så."),
  ).toBeVisible()
  await add.fill("Karin Kron")
  await page.getByRole("button", { name: "Karin Kron" }).click()
  // The panel stays open with her among those who see the case, and the summary counts
  // her, its button now managing who has it.
  await expect(access.getByRole("list", { name: "De som ser ärendet" })).toContainText("Karin Kron")
  await expect(access.getByRole("group", { exact: true, name: "Ser ärendet" })).toContainText(
    "1 person",
  )
  await expect(access.getByRole("button", { name: "Hantera" })).toBeVisible()

  // She reaches it now, and may write on it, but neither pass it on nor take it from others.
  const karin = await secondReader(browser, "Karin Kron")
  await karin.getByRole("link", { name: title }).click()
  await expect(karin.getByRole("heading", { level: 1, name: title })).toBeVisible()
  // Folded for her, and opened only to see, with no way to take it from anyone.
  const herAccess = karin.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await herAccess.getByRole("button", { name: "Visa" }).click()
  await expect(herAccess.getByRole("list", { name: "De som ser ärendet" })).toContainText(
    "Karin Kron",
  )
  await expect(karin.getByRole("button", { name: "Ta bort Karin Kron" })).toHaveCount(0)
  await expect(herAccess).toContainText("Ärendet är delat med dig.")
  // Nor is anyone offered to her, whether as a list or through a search.
  await expect(herAccess.getByRole("button", { name: /^Dela med/u })).toHaveCount(0)
  await expect(
    herAccess.getByRole("textbox", { name: "Ledare och CMT som inte ser ärendet" }),
  ).toHaveCount(0)
  await karin.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await expect(karin.getByRole("menuitem", { name: "Byt rubrik" })).toBeVisible()

  // Taking it back is one press, and she no longer reaches it.
  await page.getByRole("button", { name: "Ta bort Karin Kron" }).click()
  await expect(access.getByRole("button", { name: "Hantera" })).toHaveCount(0)
  await karin.goto("/cases")
  await expect(karin.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await showWaiting(karin)
  await expect(karin.getByRole("link", { name: title })).toHaveCount(0)
  await karin.context().close()
})

test("keeps a note from some of those who see the case", async ({ browser, page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Ledare och CMT som inte ser ärendet" })
    .fill("Karin Kron")
  await page.getByRole("button", { name: "Karin Kron" }).click()
  await expect(access.getByRole("button", { name: "Hantera" })).toBeVisible()

  // One note for everyone, one for the health team alone, and one for Helena alone – the
  // choice staying as it was between notes, and each secret one marked with who it is for.
  const field = page.getByRole("textbox", { name: "Ny anteckning" })
  const add = page.getByRole("button", { name: "Lägg till anteckning" })
  const audience = page.getByRole("combobox", { name: "Vem ser anteckningen?" })
  await field.fill("Till alla.")
  await add.click()
  await expect(field).toHaveValue("")
  await audience.selectOption({ label: "Bara hälsoteamet" })
  await field.fill("Till hälsoteamet.")
  await add.click()
  await expect(field).toHaveValue("")
  await expect(audience.locator("option:checked")).toHaveText("Bara hälsoteamet")
  await audience.selectOption({ label: "Bara du" })
  await field.fill("Till mig själv.")
  await add.click()

  const entries = timeline(page)
  await expect(entries.first()).toContainText("Till mig själv.")
  await expect(entries.first()).toContainText("Bara du")
  await expect(entries.nth(1)).toContainText("Bara hälsoteamet")
  await expect(entries.nth(2)).toContainText("Till alla.")

  // Karin, whom the case is only shared with, reads the note for everyone and nothing else.
  const karin = await secondReader(browser, "Karin Kron")
  await karin.getByRole("link", { name: title }).click()
  await expect(karin.getByText("Till alla.")).toBeVisible()
  await expect(karin.getByText("Till hälsoteamet.")).toHaveCount(0)
  await expect(karin.getByText("Till mig själv.")).toHaveCount(0)
  // Nor may she write one only the health team reads, though she may keep one to herself.
  await karin.getByRole("textbox", { name: "Ny anteckning" }).click()
  const karinsAudience = karin.getByRole("combobox", { name: "Vem ser anteckningen?" })
  await expect(karinsAudience.locator("option", { hasText: "Bara hälsoteamet" })).toHaveCount(0)
  await expect(karinsAudience.locator("option", { hasText: "Bara du" })).toHaveCount(1)
  await karin.context().close()
})

test("offers a CMT case to the leaders of its person's unit alone", async ({
  browser,
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")
  const title = uniqueTitle(testInfo)
  await openCase(page, {}, "Ester Dahl", title)

  // All of CMT sees it already, so only the leaders of Ester's unit are offered – as a
  // list, since there are only a couple of them.
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const offered = access.getByRole("list", { name: "Ledare i avdelning 1 som inte ser ärendet" })
  await expect(offered.getByRole("listitem")).toHaveCount(2)
  await expect(offered).toContainText("Lars Lindberg")
  await expect(offered).toContainText("Hanna Hellström")
  await expect(offered).not.toContainText("Karin Kron")
  await access.getByRole("button", { name: "Dela med Lars Lindberg" }).click()
  await expect(access.getByRole("list", { name: "De som ser ärendet" })).toContainText(
    "Lars Lindberg",
  )

  // Lars reads only his own unit, yet the case names the management member who opened it,
  // since every leader may read an adult's name.
  const lars = await secondReader(browser, "Lars Lindberg")
  await lars.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  await lars
    .getByRole("link", { name: /Ester Dahl/u })
    .filter({ hasText: title })
    .click()
  await expect(timeline(lars).last()).toContainText("Pernilla Palm skapade ärendet.")
  await lars.context().close()
})

test("adds a note to an open case, newest first", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, healthCase, "Molly Sundqvist", uniqueTitle(testInfo))

  const add = page.getByRole("button", { name: "Lägg till anteckning" })
  const field = page.getByRole("textbox", { name: "Ny anteckning" })
  // The tools stay out of the way of a case only being read, until the field is used.
  await expect(add).toHaveCount(0)
  await field.click()
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

test("attaches a picture to a note, and opens it larger", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, healthCase, "Molly Sundqvist", uniqueTitle(testInfo))

  // Chosen, a picture waits under the field and can be taken back out.
  await page.getByRole("textbox", { name: "Ny anteckning" }).click()
  const picker = page.locator('input[type="file"]')
  const chosen = page.getByRole("list", { name: "Bilder till anteckningen" })
  await picker.setInputFiles(photo)
  await expect(chosen.getByRole("img", { name: "Bild 1" })).toBeVisible()
  await page.getByRole("button", { name: "Ta bort bild 1" }).click()
  await expect(chosen).toHaveCount(0)
  await picker.setInputFiles(photo)

  await page.getByRole("textbox", { name: "Ny anteckning" }).fill("Utslag på armen.")
  await page.getByRole("button", { name: "Lägg till anteckning" }).click()

  // The note carries its picture, and the composer is empty for the next.
  const note = timeline(page).filter({ hasText: "Utslag på armen." })
  const picture = note.getByRole("button", { name: "Bild" })
  await expect(picture).toBeVisible()
  await expect(chosen).toHaveCount(0)

  await picture.click()
  const preview = page.getByRole("dialog", { name: "Bild" })
  await expect(preview).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(preview).toHaveCount(0)
})

test("keeps a picture that did not arrive, to send again to the same note", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, healthCase, "Molly Sundqvist", uniqueTitle(testInfo))

  // The first attempt is lost, as on a connection that drops.
  await page.route("**/attachments", (route) => route.abort())
  await page.getByRole("textbox", { name: "Ny anteckning" }).click()
  await page.locator('input[type="file"]').setInputFiles(photo)
  await page.getByRole("textbox", { name: "Ny anteckning" }).fill("Svullnaden har lagt sig.")
  await page.getByRole("button", { name: "Lägg till anteckning" }).click()

  // The note is written without it, and the picture waits in the composer's place.
  await expect(page.getByText("Anteckningen sparades, men 1 bild kom inte fram.")).toBeVisible()
  const note = timeline(page).filter({ hasText: "Svullnaden har lagt sig." })
  await expect(note).toBeVisible()
  await expect(note.getByRole("button", { name: "Bild" })).toHaveCount(0)

  await page.unroute("**/attachments")
  await page.getByRole("button", { name: "Försök igen" }).click()
  await expect(note.getByRole("button", { name: "Bild" })).toBeVisible()
  await expect(timeline(page).filter({ hasText: "Svullnaden har lagt sig." })).toHaveCount(1)
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toBeVisible()
})

test("assigns a case to the reader, who finds it on the start screen", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  // Taken on straight from the card, she is named as responsible.
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(responsible(access)).toHaveText("Ingen")
  await access.getByRole("button", { name: "Jag tar det" }).click()
  await expect(responsible(access)).toHaveText("Helena Hägg (du)")
  await expect(access.getByRole("button", { name: "Jag tar det" })).toHaveCount(0)

  // The start screen lists it as hers, and so no longer among those that wait, and so
  // does the section – first among her own, then under way rather than waiting.
  await page.goto("/")
  await expect(page.getByRole("list", { name: "Ärenden du är ansvarig för" })).toContainText(title)
  await expect(page.getByRole("list", { name: "Ärenden som väntar" })).not.toContainText(title)
  await page.goto("/cases")
  // Searched for, because the walks' own cases pile up in a mock that outlives them, and
  // a list draws only the rows in view.
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  await expect(page.getByRole("list", { name: "Du är ansvarig" })).toContainText(title)
  await expect(page.getByRole("list", { name: "Du har skapat" })).toHaveCount(0)
  // Searched for, Väntar draws no list at all, since the case no longer waits.
  await page.getByRole("button", { name: "Väntar", pressed: false }).click()
  await expect(page.getByRole("button", { name: "Väntar", pressed: true })).toBeVisible()
  await expect(page.getByRole("link", { name: title })).toHaveCount(0)
  await page.getByRole("button", { name: "Pågår", pressed: false }).click()
  await expect(page.getByRole("link", { name: title })).toBeVisible()
  await page.goto("/")

  // Narrowed to health, the start screen keeps the choice on the way back.
  const types = page.getByRole("group", { name: "Typ av ärende" })
  await types.getByRole("button", { name: "Hälsa" }).click()
  await page.goto("/cases")
  await page.goto("/")
  await expect(types.getByRole("button", { name: "Hälsa" })).toHaveAttribute("aria-pressed", "true")

  // Taken off it again, nobody is responsible and the way to take it on is back.
  await page
    .getByRole("list", { name: "Ärenden du är ansvarig för" })
    .getByRole("link", { name: title })
    .click()
  await responsible(access).click()
  await access.getByRole("button", { name: /^Ta bort ansvarig Helena Hägg/u }).click()
  await expect(responsible(access)).toHaveText("Ingen")
  await expect(access.getByRole("button", { name: "Jag tar det" })).toBeVisible()
  // The choice stays open, since the next thing is usually to choose someone else.
  await expect(access.getByRole("group", { name: "Välj ansvarig" })).toBeVisible()

  // Taken on from its row instead, it stops waiting and is hers on the start screen.
  await page.goto("/cases?lista=waiting")
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  const take = page.getByRole("button", { name: `Jag tar det: ${title}` })
  // A row ignores a press for a moment after it appears, and just after the page moves, so
  // the press is repeated until it lands, as a reader would press again.
  // Pressed only while the button is still there, and briefly, because a press that landed
  // takes the row away mid-retry.
  await expect(async () => {
    if ((await take.count()) > 0) {
      await take.click({ timeout: 500 })
    }
    await expect(page.getByRole("link", { name: title })).toHaveCount(0, { timeout: 500 })
  }).toPass()
  await page.goto("/")
  await expect(page.getByRole("list", { name: "Ärenden du är ansvarig för" })).toContainText(title)
})

test("leads from the start screen to every case that waits, and keeps the list", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  // Enough of her own beside the seeded ones that the card cannot show them all.
  const first = uniqueTitle(testInfo)
  const titles = [first, uniqueTitle(testInfo), uniqueTitle(testInfo)]
  for (const title of titles) {
    await openCase(page, healthCase, "Molly Sundqvist", title)
  }

  await page.goto("/")
  await expect(
    page.getByRole("list", { name: "Ärenden som väntar" }).getByRole("link"),
  ).toHaveCount(5)
  await page.getByRole("link", { name: /^Alla \d+ ärenden som väntar$/u }).click()
  await expect(page).toHaveURL(/\/cases\?lista=waiting$/u)
  await expect(page.getByRole("button", { name: "Väntar", pressed: true })).toBeVisible()
  // Each searched for, because the walks' own cases pile up in a mock that outlives them,
  // and a list draws only the rows in view.
  const list = page.getByRole("list", { name: "Väntar" })
  const search = page.getByRole("searchbox", { name: "Sök ärenden" })
  for (const title of titles) {
    await search.fill(title)
    await expect(list.getByRole("link", { name: title })).toBeVisible()
  }

  // The list is in the address, so back from a case returns to it.
  await search.fill(first)
  await list.getByRole("link", { name: first }).click()
  await expect(page.getByRole("heading", { level: 1, name: first })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("button", { name: "Väntar", pressed: true })).toBeVisible()
})

test("makes someone responsible through a search, where many could be", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, { scope: "CMT" }, "Alva Lundgren", uniqueTitle(testInfo))

  // All of CMT sees a CMT case, too many to list, so the panel searches them.
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await responsible(access).click()
  const search = access.getByRole("textbox", { name: "Kan bli ansvariga" })
  await search.fill("Karin")
  await access.getByRole("button", { name: /^Karin Kron/u }).click()
  await expect(responsible(access)).toHaveText("Karin Kron")
  // Chosen, the choice is put away.
  await expect(access.getByRole("group", { name: "Välj ansvarig" })).toHaveCount(0)
})

test("closes a case once asked, and reopens it", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await openCase(page, healthCase, "Molly Sundqvist", uniqueTitle(testInfo))

  const close = page.getByRole("button", { name: "Avsluta", exact: true }).filter({ visible: true })
  const reopen = page.getByRole("button", { name: "Återöppna" }).filter({ visible: true })

  // Closing asks first, and stepping back leaves the case open.
  await close.click()
  const dialog = page.getByRole("dialog", { name: "Avsluta ärendet?" })
  const lost = "Det du skrivit men inte skickat försvinner"
  await expect(dialog).toBeVisible()
  await expect(dialog).not.toContainText(lost)
  await dialog.getByRole("button", { name: "Avbryt" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(close).toBeFocused()

  // A note written but not sent is named as lost, and stays when the case stays open.
  const field = page.getByRole("textbox", { name: "Ny anteckning" })
  await field.fill("Ringer föräldrarna i kväll.")
  await close.click()
  await expect(dialog).toContainText(lost)
  await dialog.getByRole("button", { name: "Avbryt" }).click()
  await expect(field).toHaveValue("Ringer föräldrarna i kväll.")
  await field.fill("")

  // Going ahead closes it: no notes are taken, the closing leads the timeline, and the
  // way back replaces the way out.
  await close.click()
  await dialog.getByRole("button", { name: "Avsluta ärendet" }).click()
  await expect(reopen).toBeVisible()
  await expect(close).toHaveCount(0)
  await expect(page.getByRole("textbox", { name: "Ny anteckning" })).toHaveCount(0)
  await expect(timeline(page).first()).toContainText("Helena Hägg avslutade ärendet.")

  // Closed, nothing about it can be changed – not its title, its people, or who follows
  // it up.
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access.getByRole("button", { name: "Jag tar det" })).toHaveCount(0)
  await expect(responsible(access)).toHaveCount(0)
  await page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await expect(page.getByRole("menuitem", { name: "Visa personen" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Byt rubrik" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Lägg till person" })).toHaveCount(0)
  // Nothing to change, so nothing to set apart.
  await expect(page.getByRole("menu").getByRole("separator")).toHaveCount(0)
  await page.keyboard.press("Escape")

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

test("offers the health team a person's cases from their own screen", async ({
  page,
}, testInfo) => {
  await openUnitsReveal(page)
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  await page.goto(`/participants/${molly}`)
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()

  // Canceling a new case goes back to her rather than onward, and leaves no form
  // behind to go back to.
  const menu = page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true })
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Nytt ärende" })).toBeVisible()
  await page.getByRole("button", { name: "Avbryt" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/\/cases\/new/u)
  await page.goForward()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()

  // A new case about her starts with her chosen, so its kind and a title are all it takes.
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("button", { name: "Byt Molly Sundqvist" })).toBeVisible()
  await page.getByRole("radio", { name: /^Hälsa/u }).check()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")

  // Her cases, under a card saying who they are about – and back to her again. The one
  // just opened is led by its title rather than her name, since the card already says
  // who. Found by its title, because other walks' cases about her, some about more people
  // than her, pile up in a mock that outlives them.
  await page.goto(`/participants/${molly}`)
  await menu.click()
  await page.getByRole("menuitem", { name: "Visa ärenden" }).click()
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
  const row = page.getByRole("list", { name: "Öppna ärenden" }).getByRole("link", { name: title })
  await expect(row).toBeVisible()
  await expect(row).not.toContainText("Molly Sundqvist")
  await page.getByRole("button", { name: "Molly Sundqvist" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
})

test("offers the health team a unit's cases from the unit's own screen", async ({
  page,
}, testInfo) => {
  await openUnitsReveal(page)
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  // A case of her own about Ester, the latest change and so the first row.
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Ester Dahl", title)
  await page.goto("/participants/groups/1")
  await expect(page.getByRole("heading", { level: 1, name: /Avdelning 1/u })).toBeVisible()

  // The unit's cases, under a card saying which unit – the one about Ester among those
  // about its people, since she is in it.
  const menu = page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true })
  await menu.click()
  await page.getByRole("menuitem", { name: "Visa ärenden" }).click()
  await expect(page).toHaveURL(/\/cases\/unit\/1$/u)
  await expect(page.getByRole("list", { name: "Personer i avdelningen" })).toContainText(title)
  await page.goBack()

  // A new case from the unit starts about the unit as a whole.
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Nytt ärende" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Byt Avdelning 1" })).toBeVisible()
})

test("keeps a leader to their own unit's cases", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The unit's case is his to read, and no health or management case is. Found by
  // searching, because the walks' own cases pile up above it in a mock that outlives them.
  await page.locator(".sidemenu").getByRole("link", { name: "Ärenden" }).click()
  await showWaiting(page)
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("Leo")
  // Every case he keeps is his own unit's, so the row names neither the unit nor the kind.
  const row = page.getByRole("link", { name: /Hemlängtan/u }).filter({ hasText: "Leo Ström" })
  await expect(row).toContainText("Skapat av Lars Lindberg")
  await expect(row).not.toContainText("Avd")
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("Feber")
  await expect(page.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("Tidig hemresa")
  await expect(page.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("")

  // His own unit is the one kind of case he may open, so nothing asks it, the levels name
  // its leaders – but never its leaders alone, since they all see it – and the search
  // keeps to its deltagare. Nothing names the unit by its number, since it is his.
  await page.getByRole("link", { name: "Nytt ärende" }).click()
  await expect(page.getByText("Typ av ärende")).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /^Avdelningens ledare/u })).toBeChecked()
  await expect(page.getByRole("radio", { name: /^Bara ledarna/u })).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /^Bara du/u })).toBeVisible()
  const search = page.getByRole("textbox", { name: "Vem gäller det?" })
  // He knows his unit's people, so they are listed before he types under a heading of
  // their own, below the unit as a whole – a choice of its own rather than something the
  // search turns up.
  await expect(page.getByRole("button", { name: "Hela avdelningen" })).toBeVisible()
  await expect(page.getByRole("list", { name: "Personer" })).toContainText("Ester Dahl")
  await expect(page.getByText("Avdelningar", { exact: true })).toHaveCount(0)
  await search.fill("Forsberg")
  await expect(page.getByRole("button", { name: /^Ester Dahl/u })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Hela avdelningen" })).toBeVisible()
  // By name alone – neither the unit's number nor its name finds its people.
  await search.fill("1")
  await expect(page.getByText("Ingen deltagare i avdelningen heter så.")).toBeVisible()
  await search.fill("Björnen")
  await expect(page.getByText("Ingen deltagare i avdelningen heter så.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Hela avdelningen" })).toBeVisible()
  await search.fill("Molly")
  await expect(page.getByText("Ingen deltagare i avdelningen heter så.")).toBeVisible()
  // Nor is a fellow leader of the unit someone a unit's case is about.
  await search.fill("Hanna")
  await expect(page.getByText("Ingen deltagare i avdelningen heter så.")).toBeVisible()

  await search.fill("Ester Dahl")
  const ester = page.getByRole("button", { name: "Ester Dahl" })
  await expect(ester).toContainText("Deltagare")
  await expect(ester).not.toContainText("Avdelning")
  await page.getByRole("button", { name: "Ester Dahl" }).click()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access.getByRole("group", { exact: true, name: "Ser ärendet" })).toContainText(
    "Alla ledare i avdelningen",
  )
  await expect(access).not.toContainText("Avdelning 1")
  await expect(page.getByRole("region", { name: "Gäller" })).not.toContainText("Avdelning")

  // Every leader he could share it with sees it already, so nothing offers to, and a note
  // cannot be kept from them either.
  await expect(access.getByRole("button", { name: "Dela", exact: true })).toHaveCount(0)
  await page.getByRole("textbox", { name: "Ny anteckning" }).click()
  const audience = page.getByRole("combobox", { name: "Vem ser anteckningen?" })
  await expect(audience.locator("option", { hasText: "Bara ledarna" })).toHaveCount(0)
  await expect(audience.locator("option", { hasText: "Bara du" })).toHaveCount(1)

  // Only the unit's other leaders see it beside him, few enough to be listed rather
  // than searched for.
  await responsible(access).click()
  const panel = access.getByRole("group", { name: "Välj ansvarig" })
  await expect(panel.getByRole("list", { name: "Kan bli ansvariga" })).toBeVisible()
  await expect(panel.getByRole("textbox")).toHaveCount(0)
  await panel.getByRole("button", { name: "Välj Hanna Hellström" }).click()
  await expect(responsible(access)).toHaveText("Hanna Hellström")
  await expect(panel).toHaveCount(0)
})

test("opens a leader's case about the whole unit, never naming the unit's number", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await page.goto("/cases/new")
  await page.getByRole("button", { name: "Hela avdelningen" }).click()
  await expect(page.getByRole("button", { name: "Byt Hela avdelningen" })).toBeVisible()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()

  // His own unit is the whole unit to him, on the case and in the list alike.
  const about = page.getByRole("region", { name: "Gäller" })
  await expect(about).toContainText("Hela avdelningen")
  await expect(about).not.toContainText("Avdelning 1")
  await page.goto("/cases?lista=waiting")
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  const row = page.getByRole("link", { name: title })
  await expect(row).toContainText("Hela avdelningen")
  await expect(row).not.toContainText("Avdelning 1")
})

test("lets a leader share a private case with the unit's other leaders, without a search", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  const title = uniqueTitle(testInfo)
  await openCase(page, { level: "Bara du" }, "Ester Dahl", title)

  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access.getByRole("group", { exact: true, name: "Ser ärendet" })).toContainText(
    "Bara du",
  )
  // Only the unit's other leaders are offered, named as leaders who do not see it, and
  // listed rather than searched for.
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const offered = access.getByRole("list", { name: "Ledare i avdelningen som inte ser ärendet" })
  await expect(offered).toContainText("Hanna Hellström")
  await expect(access.getByRole("textbox")).toHaveCount(0)
  await access.getByRole("button", { name: "Dela med Hanna Hellström" }).click()
  await expect(access.getByRole("list", { name: "De som ser ärendet" })).toContainText(
    "Hanna Hellström",
  )
  await expect(access.getByText("Det finns ingen mer att dela ärendet med.")).toBeVisible()
})

test("hides the section from someone with no case type", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Olle Ohlsson")

  await expect(page.locator(".sidemenu").getByRole("link", { name: "Hem" })).toBeVisible()
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Ärenden" })).toHaveCount(0)

  // His opening the section's address answers exactly as an address that matches
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

test("opens a case its group alone sees, which can never be shared", async ({
  browser,
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, { level: "Bara hälsoteamet", scope: "Hälsa" }, "Alva Lundgren", title)

  const access = page.getByRole("region", { name: "Ansvarig och vem som ser ärendet" })
  await expect(access.getByRole("group", { exact: true, name: "Ser ärendet" })).toContainText(
    "Bara hälsoteamet",
  )
  await expect(access.getByRole("button", { exact: true, name: "Dela" })).toHaveCount(0)
  await expect(responsible(access)).toBeVisible()
  // Its panel says why nobody more can be let in.
  await access.getByRole("button", { name: "Visa" }).click()
  await expect(access).toContainText("Ärendet kan aldrig delas med någon annan.")

  // Pernilla is in the management but not in the health team, so the case is not hers.
  const pernilla = await secondReader(browser, "Pernilla Palm")
  await pernilla.getByRole("searchbox", { name: "Sök ärenden" }).fill(title)
  await expect(pernilla.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
  await pernilla.context().close()
})

test("gives a personal health grant the management's cases, and no health case", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Henrik Holm")

  // The grant opens health answers in the list of participants, but the cases service
  // reads only the roll, so his section holds what the management's role reaches.
  await page.locator(".sidemenu").getByRole("link", { name: "Ärenden" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Nytt ärende" })).toBeVisible()
  await showWaiting(page)
  const search = page.getByRole("searchbox", { name: "Sök ärenden" })
  await search.fill("Tidig hemresa")
  await expect(page.getByRole("link", { name: /Tidig hemresa/u })).toBeVisible()
  await search.fill("Feber")
  await expect(page.getByText("Inga ärenden matchar sökningen.")).toBeVisible()
})

test("keeps the section open on the cases listed when the types cannot be read", async ({
  page,
}) => {
  // A types read that reaches nothing settles as no type to open, and the section is then
  // granted by the cases the service still lists – without a way to open one.
  await page.route("**/api/project/cases/types", (route) => route.abort())
  await page.goto("/")
  await signInAs(page, "Karin Kron")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Ärenden" })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Nytt ärende" })).toHaveCount(0)
  await showWaiting(page)
  await expect(page.getByRole("link", { name: /Tidig hemresa/u })).toBeVisible()
})
