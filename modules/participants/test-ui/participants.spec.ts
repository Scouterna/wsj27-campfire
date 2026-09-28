import { expect, test, type Page } from "@playwright/test"

// The participants section, walked as the people who use it: a leader reading their
// own unit, the contingent management searching and narrowing the whole contingent,
// opening a person and coming back to the list as it was, a list kept when a fresh read
// fails, browsing by unit, the information levels the service grants, and – for a
// person outside the contingent – no section at all, with its address answering exactly
// as one that matches nothing.

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

/**
 * The link a mail entry opens: every address a hidden copy, and nobody any other way.
 * @param addresses The addresses, encoded as the link carries them.
 * @returns The `mailto:` address.
 */
function hiddenCopies(addresses: readonly string[]): string {
  return `mailto:?bcc=${addresses.join(",")}`
}

test("keeps a long unit's rows under the reader all the way to its end", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  const list = page.getByRole("list", { name: "Deltagare" })
  await expect(list.getByRole("listitem").first()).toBeVisible()

  // Down in steps, as a wheel scrolls, so the rows are drawn and measured on the way and
  // the list has to keep finding where it sits. A wheel lands when the page gets to it,
  // so the steps go on until the end is reached rather than for a fixed count.
  // Waiting on the unit's last person rather than the last row drawn, because right after
  // a step the rows drawn for the previous one are still on screen.
  await page.mouse.move(640, 450)
  const end = list.locator('[role="listitem"][aria-posinset="40"]')
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(end).toBeInViewport({ timeout: 250 })
  }).toPass({ timeout: 10_000 })
})

test("shows a leader their own unit, with the unit's own filter", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  const link = page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole("heading", { level: 1, name: "Min avdelning" })).toBeVisible()
  await expect(page).toHaveTitle("Min avdelning – Campfire")

  // The unit's own people, and nobody from anywhere else.
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
  await expect(page.getByRole("listitem")).toHaveCount(8)
  await expect(page.getByRole("listitem").filter({ hasText: "Avdelning 2" })).toHaveCount(0)

  // A unit is searched and narrowed too, in its own vocabulary – a unit holds deltagare
  // and ledare, so IST and CMT are not offered. The way in by unit stays the
  // management's.
  await expect(page.getByRole("searchbox", { name: "Sök deltagare" })).toBeVisible()
  const filter = page.getByRole("group", { name: "Filtrera efter roll" })
  await expect(filter.getByRole("button")).toHaveCount(3)
  await expect(filter.getByRole("button", { name: "IST" })).toHaveCount(0)
  await filter.getByRole("button", { name: "Ledare", pressed: false }).click()
  await expect(page.getByRole("status")).toHaveText("2 av 8 personer")
  await expect(page.getByRole("link", { name: "Avdelningar" })).toHaveCount(0)
})

test("says where a leader's own people come from, their gender, and how old the deltagare are", async ({
  page,
}) => {
  await page.goto("/participants")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // Every row in the unit shares its unit, so where the person comes from takes the
  // unit's place, at every width – and the gender and a deltagare's age ride at the
  // row's end, the gender first.
  const rows = page.getByRole("listitem")
  const ester = rows.getByRole("link", { name: /^Ester Dahl/u })
  await expect(ester).toContainText("Deltagare · Mockåsens scoutkår · Kungsbacka")
  await expect(ester.locator(".person-row-facts > :first-child")).toHaveAccessibleName("Kvinna")
  await expect(ester.locator(".person-row-age")).toHaveText(/^\d{1,3} år$/u)
  const lars = rows.getByRole("link", { name: /^Lars Lindberg/u })
  await expect(lars).toContainText("Ledare · Mockåsens scoutkår · Göteborg")
  await expect(lars.getByRole("img", { name: "Man" })).toBeVisible()
  await expect(lars.locator(".person-row-age")).toHaveCount(0)

  // Annat has a sign of its own. Okänt has none, because a dash before the age would
  // read as a minus.
  const edvin = rows.getByRole("link", { name: /^Edvin Malm/u })
  await expect(edvin.getByRole("img", { name: "Annat" })).toBeVisible()
  const otto = rows.getByRole("link", { name: /^Otto Lind/u })
  await expect(otto.locator(".person-row-age")).toHaveText(/^\d{1,3} år$/u)
  await expect(otto.locator(".gender-mark")).toHaveCount(0)

  await page.setViewportSize({ height: 844, width: 390 })
  await expect(ester).toContainText("Deltagare · Mockåsens scoutkår · Kungsbacka")
})

test("says where the management's rows come from only where the line has room", async ({
  page,
}) => {
  await page.setViewportSize({ height: 768, width: 1024 })
  await page.goto("/participants")
  await signInAs(page, "Anna Almgren")
  await expect(page.getByRole("status")).toHaveText("59 personer i kontingenten")

  // The whole contingent keeps its line – role, unit, and the unit's name – and a wide
  // screen says where the person comes from after it. Searched for, because the rows far
  // down a list this long are not in the document.
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("Lars Lindberg")
  const lars = page.getByRole("listitem").getByRole("link", { name: /^Lars Lindberg/u })
  await expect(lars).toContainText("Ledare · Avdelning 1")
  const from = lars.locator(".person-row-wide")
  await expect(from).toBeVisible()
  await expect(from).toHaveText(" · Mockåsens scoutkår · Göteborg")

  // A phone's line has no room for both, so it keeps the one it had.
  await page.setViewportSize({ height: 844, width: 390 })
  await expect(lars).toContainText("Ledare · Avdelning 1")
  await expect(from).toBeHidden()
})

test("names a person's home town, age, and gender on their own page", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await page.goto("/participants/1300035")
  await expect(page).toHaveTitle("Ester Dahl – Campfire")
  const profile = page.locator(".person-profile-grid")
  await expect(profile.getByText("Hemort")).toBeVisible()
  await expect(profile.getByText("Kungsbacka")).toBeVisible()
  // The age rides after the birth date, and the gender has the slot beside it.
  await expect(profile.getByText(/^10 augusti 2009 · \d+\sår$/u)).toBeVisible()
  await expect(profile.getByText("Ålder")).toHaveCount(0)
  await expect(profile.getByText("Kön")).toBeVisible()
  // The word is written out beside the sign, so the sign is not read a second time.
  await expect(profile.getByText("Kvinna", { exact: true })).toBeVisible()
  await expect(profile.locator(".gender-mark")).toBeVisible()
  await expect(profile.getByRole("img", { name: "Kvinna" })).toHaveCount(0)

  // Okänt is said in words alone, with no sign.
  await page.goto("/participants/1300077")
  await expect(page).toHaveTitle("Otto Lind – Campfire")
  await expect(profile.getByText("Okänt", { exact: true })).toBeVisible()
  await expect(profile.locator(".gender-mark")).toHaveCount(0)
})

test("opens a unit's card up to the map of where it lives, and folds it back", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  await page.goto("/participants/units/1")
  await expect(page.getByRole("heading", { level: 1, name: "Avdelning 1" })).toBeVisible()

  // The folded card is the button; opened, the map is a region and the same control
  // folds it back. The walk lets the tile service through, but asks nothing of it – the
  // dots and the control stand whether or not a tile arrives.
  await page.getByRole("button", { name: "Visa på kartan" }).click()
  const close = page.getByRole("button", { name: "Stäng kartan" })
  await expect(close).toHaveAttribute("aria-expanded", "true")
  const map = page.getByRole("region", { name: "Karta över var avdelningen bor" })
  await expect(map).toBeVisible()

  // Full screen, the map covers the whole viewport, and the only way out is back to the
  // card – by its own control, or by Escape.
  const viewport = page.viewportSize()
  await page.getByRole("button", { name: "Helskärm" }).click()
  const shrink = page.getByRole("button", { name: "Stäng helskärm" })
  await expect(shrink).toBeVisible()
  await expect(close).toHaveCount(0)
  await expect
    .poll(async () => map.boundingBox())
    .toEqual({ height: viewport?.height, width: viewport?.width, x: 0, y: 0 })

  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Helskärm" })).toBeVisible()
  await expect(close).toBeVisible()

  await page.getByRole("button", { name: "Helskärm" }).click()
  await shrink.click()
  await expect(page.getByRole("button", { name: "Helskärm" })).toBeVisible()
  await expect
    .poll(async () => {
      const box = await map.boundingBox()
      return box?.y
    })
    .toBeGreaterThan(0)

  await close.click()
  await expect(page.getByRole("button", { name: "Visa på kartan" })).toHaveAttribute(
    "aria-expanded",
    "false",
  )
  await expect(page.getByRole("region", { name: "Karta över var avdelningen bor" })).toHaveCount(0)

  // The IST and the management are no avdelning, so neither page has a unit's card.
  await page.goto("/participants/units/ist")
  await expect(page.getByRole("heading", { level: 1, name: "IST" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Visa på kartan" })).toHaveCount(0)
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

  // A roll on top of the search narrows further, and the search survives the chip.
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

test("asks again on every visit, and keeps the list it has when the ask fails", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  const menu = page.locator(".sidemenu")
  await menu.getByRole("link", { name: "Min avdelning" }).click()
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
  await menu.getByRole("link", { name: "Hem" }).click()

  // The next visit asks the service again even though the list is cached, and the
  // ask fails – the list it already had stays, rather than an error in its place.
  await page.route("**/participants/troopinfo/1*", (route) => route.abort())
  const again = page.waitForRequest((request) =>
    request.url().includes("/participants/troopinfo/1"),
  )
  await menu.getByRole("link", { name: "Min avdelning" }).click()
  await again

  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")
  await expect(page.getByRole("listitem")).toHaveCount(8)
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

  // The service drops a leader's contact answers for a fellow leader, so there are no
  // emergency contacts, and the unsent mobile gets its designed absent state – worded
  // exactly as any other absence, with no reason given.
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
  await expect(page.locator(".sidemenu-items").getByRole("link")).toHaveCount(1)
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
  const pill = page.getByRole("link", { name: "Profil för Pernilla Palm" })
  await expect(pill).toContainText("CMT · Program")
})

test("offers the management the addresses but not the sheet", async ({ page }) => {
  await page.goto("/participants")
  await signInAs(page, "Anna Almgren")
  // The menu is published from the rows the list holds, so it exists only once they do.
  await expect(page.getByRole("status")).toHaveText("59 personer i kontingenten")

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await expect(page.getByRole("menuitem")).toHaveCount(4)
  await expect(page.getByRole("menuitem", { name: "Exportera till Excel" })).toHaveCount(0)
})

test("mails and copies the addresses of the list as it is narrowed", async ({ context, page }) => {
  // The clipboard is the browser's to grant, and a walk has nobody to ask.
  await context.grantPermissions(["clipboard-read", "clipboard-write"])

  await page.goto("/participants")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // Every entry a leader gets, acting on the unit's people – every address a hidden
  // copy, and the sheet of them all at the end.
  const trigger = page.getByRole("button", { name: "Fler åtgärder" })
  await trigger.click()
  await expect(page.getByRole("menuitem")).toHaveText([
    "Mejla personerna i listan",
    "Kopiera e-postadresserna",
    "Mejla deras kontaktpersoner",
    "Kopiera kontaktpersonernas e-postadresser",
    "Exportera till Excel",
  ])
  const everyone = await page
    .getByRole("menuitem", { name: "Mejla personerna i listan" })
    .getAttribute("href")
  expect(everyone).toMatch(/^mailto:\?bcc=/u)
  // One address more than there are people, because Ester gave an alternative one, and
  // the registration promises it the same jamboree information as her primary, so both
  // are written to.
  expect(everyone?.split(",")).toHaveLength(9)
  expect(everyone).toContain("leo.str%C3%B6m@example.se")
  expect(everyone).toContain("ester.dahl@example.org")

  // Everybody the unit's people named around them. The deltagare and the IST gave
  // närstående, and their form asks for no nödkontakt; a leader's own answers a fellow
  // leader may not read at all, so the unit's leaders name nobody here.
  const relatives = await page
    .getByRole("menuitem", { name: "Mejla deras kontaktpersoner" })
    .getAttribute("href")
  expect(relatives).toBe(
    hiddenCopies([
      "katarina.axelsson@example.se",
      "maria.str%C3%B6m@example.se",
      "bj%C3%B6rn.str%C3%B6m@example.se",
    ]),
  )
  await page.keyboard.press("Escape")

  // Narrowing the list chooses who to write to. A fellow leader may not read the
  // leaders' own contact answers, so those entries stay, and say why.
  await page.getByRole("button", { name: "Ledare", pressed: false }).click()
  await expect(page.getByRole("status")).toHaveText("2 av 8 personer")
  await trigger.click()
  await expect(page.getByRole("menuitem", { name: "Mejla personerna i listan" })).toHaveAttribute(
    "href",
    hiddenCopies(["hanna.hellstr%C3%B6m@example.se", "lars.lindberg@example.se"]),
  )
  const noContacts = page.getByRole("menuitem", { name: /^Mejla deras kontaktpersoner/u })
  await expect(noContacts).toHaveAttribute("aria-disabled", "true")
  await expect(noContacts).toContainText("Inga e-postadresser i listan.")
  // Chosen anyway, it does nothing – the menu stays as it was. By keyboard, because the
  // entry stays reachable that way, and the browser driver declines to click what is
  // announced as disabled.
  await noContacts.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("menu")).toBeVisible()

  // A copy lands on the clipboard ready to paste, and the entry itself says that it did
  // – where the press landed – before the menu closes by itself.
  await page.getByRole("menuitem", { name: "Kopiera e-postadresserna" }).click()
  await expect(page.getByRole("menuitem", { name: "2 adresser kopierade" })).toBeVisible()
  expect(await page.evaluate(async () => navigator.clipboard.readText())).toBe(
    "hanna.hellström@example.se, lars.lindberg@example.se",
  )
  await expect(page.getByRole("menu")).toHaveCount(0)
  await expect(trigger).toBeFocused()

  // Nobody shown is nobody to write to, so the menu goes with the list.
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("zzz")
  await expect(page.getByRole("status")).toHaveText("Inga träffar.")
  await expect(trigger).toHaveCount(0)
})
