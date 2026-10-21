import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test"
import { fileURLToPath } from "node:url"

// The cases section, walked as its readers use it: the open cases and the closed ones
// behind their segment, the list narrowed and searched, a case opened about a person in
// the kind and at the level its creator chose, renamed, written on with pictures, closed,
// and reopened.
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
 * @returns The title.
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
 * A health case at the default level – the kind the health team opens most.
 */
const healthCase: Kind = { scope: "Hälsa" }

/**
 * Signs a second person in, in a browser context of their own, so a walk can compare what
 * two readers reach.
 * @param browser The browser the walk runs in.
 * @param persona The persona to pick.
 * @returns The second person's page, standing on the cases section.
 */
async function secondReader(browser: Browser, persona: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("/")
  await signInAs(page, persona)
  await page.goto("/cases")
  await expect(page.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  return page
}

/**
 * A small picture, handed over as a phone's picker hands one over.
 */
const photo = fileURLToPath(new URL("utslag.png", import.meta.url))

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

  // The health team is in the management too, so the management's case about Alva shows
  // beside the health cases, saying which kind it is. Found by searching, because the
  // walks' own cases pile up above it in a mock that outlives them.
  await page.getByRole("button", { name: "Öppna", pressed: false }).click()
  const search = page.getByRole("searchbox", { name: "Sök ärenden" })
  await search.fill("Alva")
  await expect(
    page.getByRole("link", { name: /Tidig hemresa/u }).filter({ hasText: "CMT" }),
  ).toBeVisible()

  // "Mina" keeps the cases the reader opened, which leaves out the management's case, and
  // the search narrows them by who they are about.
  await page.getByRole("button", { name: "Mina", pressed: false }).click()
  await expect(page.getByRole("link", { name: /Tidig hemresa/u })).toHaveCount(0)
  await search.fill("Molly")
  await expect(page.getByRole("link", { name: "Molly Sundqvist" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Ester Dahl" })).toHaveCount(0)
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
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await expect(access).toContainText("Hälsa")
  await expect(access).toContainText("Hela hälsoteamet ser ärendet.")
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

test("keeps a private case from the rest of its group", async ({ browser, page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, { level: "Bara du", scope: "CMT" }, "Alva Lundgren", title)
  await expect(page.getByRole("region", { name: "Vem ser ärendet" })).toContainText(
    "Bara du ser ärendet.",
  )
  await page.goto("/cases")
  await expect(page.getByRole("link", { name: title })).toContainText("Bara du")

  // Pernilla is in the management too, and reaches its case about Alva – but not Helena's
  // private one, nor any health case.
  const pernilla = await secondReader(browser, "Pernilla Palm")
  await expect(pernilla.getByRole("link", { name: /Tidig hemresa/u })).toBeVisible()
  await expect(pernilla.getByRole("link", { name: title })).toHaveCount(0)
  await expect(pernilla.getByRole("link", { name: /^Feber/u })).toHaveCount(0)
  await pernilla.context().close()
})

test("renames an open case", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)

  await page.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await page.getByRole("menuitem", { name: "Byt rubrik" }).click()
  const field = page.getByRole("textbox", { name: "Rubrik" })
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
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await expect(access.getByRole("button", { name: /^Delat med/u })).toHaveCount(0)
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const add = page.getByRole("textbox", { name: "Ledare och CMT som inte ser ärendet" })
  await add.fill("Ester Dahl")
  await expect(
    page.getByText("Ingen ledare eller i CMT som inte ser ärendet heter så."),
  ).toBeVisible()
  await add.fill("Karin Kron")
  await page.getByRole("button", { name: "Karin Kron" }).click()
  // The search closes, and the button that opened it counts her, where it always stood.
  await expect(add).toHaveCount(0)
  await access.getByRole("button", { name: "Delat med 1" }).click()
  await expect(access.getByRole("list", { name: "Delat med" })).toContainText("Karin Kron")

  // She reaches it now, and may write on it, but neither pass it on nor take it from others.
  const karin = await secondReader(browser, "Karin Kron")
  await karin.getByRole("link", { name: title }).click()
  await expect(karin.getByRole("heading", { level: 1, name: title })).toBeVisible()
  // Folded for her, and opened, with no way to take it from anyone.
  const herAccess = karin.getByRole("region", { name: "Vem ser ärendet" })
  await herAccess.getByRole("button", { name: "Delat med 1" }).click()
  await expect(herAccess.getByRole("list", { name: "Delat med" })).toContainText("Karin Kron")
  await expect(karin.getByRole("button", { name: "Ta bort Karin Kron" })).toHaveCount(0)
  await expect(herAccess.getByRole("button", { name: "Dela", exact: true })).toHaveCount(0)
  await karin.getByRole("button", { name: "Fler åtgärder" }).filter({ visible: true }).click()
  await expect(karin.getByRole("menuitem", { name: "Byt rubrik" })).toBeVisible()
  await expect(karin.getByRole("menuitem", { name: /Dela/u })).toHaveCount(0)

  // Taking it back is one press, and she no longer reaches it.
  await page.getByRole("button", { name: "Ta bort Karin Kron" }).click()
  await expect(access.getByRole("button", { name: /^Delat med/u })).toHaveCount(0)
  await karin.goto("/cases")
  await expect(karin.getByRole("heading", { level: 1, name: "Ärenden" })).toBeVisible()
  await expect(karin.getByRole("link", { name: title })).toHaveCount(0)
  await karin.context().close()
})

test("keeps a note from some of those who see the case", async ({ browser, page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Helena Hägg")
  const title = uniqueTitle(testInfo)
  await openCase(page, healthCase, "Molly Sundqvist", title)
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Ledare och CMT som inte ser ärendet" })
    .fill("Karin Kron")
  await page.getByRole("button", { name: "Karin Kron" }).click()
  await expect(access.getByRole("button", { name: "Delat med 1" })).toBeVisible()

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

test("offers a CMT case to the leaders of its person's unit alone", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Pernilla Palm")
  const title = uniqueTitle(testInfo)
  await openCase(page, {}, "Ester Dahl", title)

  // All of CMT sees it already, so only the leaders of Ester's unit are offered – as a
  // list, since there are only a couple of them.
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const offered = access.getByRole("list", { name: "Ledare i avdelning 1 som inte ser ärendet" })
  await expect(offered.getByRole("listitem")).toHaveCount(2)
  await expect(offered).toContainText("Lars Lindberg")
  await expect(offered).toContainText("Hanna Hellström")
  await expect(offered).not.toContainText("Karin Kron")
  await access.getByRole("button", { name: "Dela med Lars Lindberg" }).click()
  await expect(access.getByRole("list", { name: "Delat med" })).toContainText("Lars Lindberg")
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

  // Taken on straight from the card, she is named under who sees it.
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await expect(access).toContainText("Ingen ansvarig")
  await access.getByRole("button", { name: "Tilldela mig" }).click()
  await expect(access).toContainText("Ansvarig: Helena Hägg (du)")
  await expect(access.getByRole("button", { name: "Tilldela mig" })).toHaveCount(0)

  // The start screen lists it as hers, and so not again among the other open cases.
  await page.goto("/")
  await expect(page.getByRole("list", { name: "Mina ärenden" })).toContainText(title)
  await expect(page.getByRole("list", { name: "Öppna ärenden" })).not.toContainText(title)

  // Narrowed to health, the start screen keeps the choice on the way back.
  const types = page.getByRole("group", { name: "Typ av ärende" })
  await types.getByRole("button", { name: "Hälsa" }).click()
  await page.goto("/cases")
  await page.goto("/")
  await expect(types.getByRole("button", { name: "Hälsa" })).toHaveAttribute("aria-pressed", "true")

  // Taken off it again, nobody is responsible and the way to take it on is back.
  await page.getByRole("list", { name: "Mina ärenden" }).getByRole("link", { name: title }).click()
  await access.getByRole("button", { name: "Tilldela", exact: true }).click()
  await access.getByRole("button", { name: /^Ta bort ansvarig Helena Hägg/u }).click()
  await expect(access).toContainText("Ingen ansvarig")
  await expect(access.getByRole("button", { name: "Tilldela mig" })).toBeVisible()

  // Taken on from its row on the start screen instead, it moves to her own.
  await page.goto("/")
  await page.getByRole("button", { name: `Tilldela mig ${title}` }).click()
  await expect(page.getByRole("list", { name: "Mina ärenden" })).toContainText(title)
  await expect(page.getByRole("list", { name: "Öppna ärenden" })).not.toContainText(title)
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
  // Her open cases, each row led by its title rather than her name, since the card already
  // says who. Not one row in particular, because the walks' own cases about her pile up in
  // a mock that outlives them.
  const firstRow = page.getByRole("list", { name: "Öppna ärenden" }).getByRole("link").first()
  await expect(firstRow).toBeVisible()
  await expect(firstRow).not.toContainText("Molly Sundqvist")
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

  // A new case about her starts with her chosen, so its kind and a title are all it takes.
  await menu.click()
  await page.getByRole("menuitem", { name: "Nytt ärende" }).click()
  await expect(page.getByRole("button", { name: "Byt från Molly Sundqvist" })).toBeVisible()
  await page.getByRole("radio", { name: /^Hälsa/u }).check()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  await expect(page.getByRole("region", { name: "Gäller" })).toContainText("Molly Sundqvist")
})

test("keeps a leader to their own unit's cases", async ({ page }, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The unit's case is his to read, and no health or management case is. Found by
  // searching, because the walks' own cases pile up above it in a mock that outlives them.
  await page.locator(".sidemenu").getByRole("link", { name: "Ärenden" }).click()
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("Leo")
  await expect(
    page.getByRole("link", { name: /Hemlängtan/u }).filter({ hasText: "Avdelning 1" }),
  ).toBeVisible()
  await page.getByRole("searchbox", { name: "Sök ärenden" }).fill("")
  await expect(page.getByRole("link", { name: /^Feber/u })).toHaveCount(0)
  await expect(page.getByRole("link", { name: /Tidig hemresa/u })).toHaveCount(0)

  // His own unit is the one kind of case he may open, so nothing asks it, the levels name
  // its leaders – but never its leaders alone, since they all see it – and the search
  // keeps to its deltagare.
  await page.getByRole("link", { name: "Nytt ärende" }).click()
  await expect(page.getByText("Typ av ärende")).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /^Ledarna i avdelning 1/u })).toBeChecked()
  await expect(page.getByRole("radio", { name: /^Bara ledarna/u })).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /^Bara du/u })).toBeVisible()
  const search = page.getByRole("textbox", { name: "Vem gäller det?" })
  await search.fill("Molly")
  await expect(page.getByText("Ingen deltagare i avdelning 1 heter så.")).toBeVisible()
  // Nor is a fellow leader of the unit someone a unit's case is about.
  await search.fill("Hanna")
  await expect(page.getByText("Ingen deltagare i avdelning 1 heter så.")).toBeVisible()

  await search.fill("Ester Dahl")
  await page.getByRole("button", { name: "Ester Dahl" }).click()
  const title = uniqueTitle(testInfo)
  await page.getByRole("textbox", { name: "Rubrik" }).fill(title)
  await page.getByRole("button", { name: "Skapa ärende" }).click()
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await expect(access).toContainText("Alla ledare i avdelning 1 ser ärendet.")

  // Every leader he could share it with sees it already, so nothing offers to, and a note
  // cannot be kept from them either.
  await expect(access.getByRole("button", { name: "Dela", exact: true })).toHaveCount(0)
  await page.getByRole("textbox", { name: "Ny anteckning" }).click()
  const audience = page.getByRole("combobox", { name: "Vem ser anteckningen?" })
  await expect(audience.locator("option", { hasText: "Bara ledarna" })).toHaveCount(0)
  await expect(audience.locator("option", { hasText: "Bara du" })).toHaveCount(1)
})

test("lets a leader share a private case with the unit's other leaders, without a search", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  const title = uniqueTitle(testInfo)
  await openCase(page, { level: "Bara du" }, "Ester Dahl", title)

  const access = page.getByRole("region", { name: "Vem ser ärendet" })
  await expect(access).toContainText("Bara du ser ärendet.")
  // Only the unit's other leaders are offered, named as leaders who do not see it, and
  // listed rather than searched for.
  await access.getByRole("button", { name: "Dela", exact: true }).click()
  const offered = access.getByRole("list", { name: "Ledare i avdelning 1 som inte ser ärendet" })
  await expect(offered).toContainText("Hanna Hellström")
  await expect(access.getByRole("textbox")).toHaveCount(0)
  await access.getByRole("button", { name: "Dela med Hanna Hellström" }).click()
  await expect(access.getByRole("list", { name: "Delat med" })).toContainText("Hanna Hellström")
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
