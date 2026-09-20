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

/**
 * The link a mail entry opens: every address a hidden copy, and nobody any other way.
 * @param addresses The addresses, encoded as the link carries them.
 * @returns The `mailto:` address.
 */
function hiddenCopies(addresses: readonly string[]): string {
  return `mailto:?bcc=${addresses.join(",")}`
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

test("mails and copies the addresses of the list as it is narrowed", async ({ context, page }) => {
  // The clipboard is the browser's to grant, and a walk has nobody to ask.
  await context.grantPermissions(["clipboard-read", "clipboard-write"])

  await page.goto("/participants")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("status")).toHaveText("8 personer i avdelningen")

  // Four entries, acting on the unit's eight people – every address a hidden copy.
  const trigger = page.getByRole("button", { name: "Fler åtgärder" })
  await trigger.click()
  await expect(page.getByRole("menuitem")).toHaveText([
    "Mejla personerna i listan",
    "Kopiera e-postadresserna",
    "Mejla deras kontaktpersoner",
    "Kopiera kontaktpersonernas e-postadresser",
  ])
  const everyone = await page
    .getByRole("menuitem", { name: "Mejla personerna i listan" })
    .getAttribute("href")
  expect(everyone).toMatch(/^mailto:\?bcc=/u)
  // Nine addresses from eight people: Ester gave an alternative one, and the registration
  // promises it the same jamboree information as her primary, so both are written to.
  expect(everyone?.split(",")).toHaveLength(9)
  expect(everyone).toContain("leo.str%C3%B6m@example.se")
  expect(everyone).toContain("ester.dahl@example.org")

  // Everybody the unit's people named around them. The deltagare and the IST gave
  // närstående, and their form asks for no nödkontakt; a leader's own answers a fellow
  // leader may not read at all, so the unit's two leaders name nobody here.
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

  // Narrowing the list is choosing who to write to: the two leaders, whose own contact
  // answers a fellow leader may not read – so those entries stay, and say why.
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

  // Nobody shown is nobody to write to: the menu goes with the list.
  await page.getByRole("searchbox", { name: "Sök deltagare" }).fill("zzz")
  await expect(page.getByRole("status")).toHaveText("Inga träffar.")
  await expect(trigger).toHaveCount(0)
})
