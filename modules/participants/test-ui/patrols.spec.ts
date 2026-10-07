import { expect, test, type Page, type Route } from "@playwright/test"

// A unit's patrols, walked as the people who use them: a leader dividing their unit by
// carrying scouts between patrols or moving them from a menu, saving it, and being told
// who could not be saved – and the unit shown by patrol on the home screen, on the
// management's unit screen, and on a scout's own page.
//
// Every save is answered here rather than by the mock, because the walks share one mock
// and a patrol written by one of them would show up in another's unit.

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
 * Answers every patrol write as the service does once Scoutnet has taken it, keeps what
 * was asked for, and lays what was taken over the unit's listing, as the service's own
 * cache would hold it.
 * @param page The page whose writes to answer.
 * @param refuse The member numbers whose write fails, as the service fails when Scoutnet
 *   does.
 * @returns The bodies the page sent, by member number.
 */
async function answerPatrolWrites(
  page: Page,
  refuse: readonly string[] = [],
): Promise<Map<string, unknown>> {
  const sent = new Map<string, unknown>()
  await page.route("**/api/project/participants/*/patrol", async (route: Route) => {
    const memberNo = /participants\/(\d+)\/patrol/u.exec(route.request().url())?.[1] ?? ""
    const body: unknown = route.request().postDataJSON()
    if (refuse.includes(memberNo)) {
      await route.fulfill({ json: { detail: "Could not store in Scoutnet." }, status: 502 })
      return
    }
    sent.set(memberNo, body)
    await route.fulfill({ json: body })
  })
  await page.route("**/api/project/participants/troopinfo/*", async (route: Route) => {
    const response = await route.fetch()
    const rows = (await response.json()) as { member_no: number; scout_db?: unknown }[]
    const json = rows.map((row) => {
      const stored = sent.get(String(row.member_no))
      return stored === undefined ? row : { ...row, scout_db: stored }
    })
    await route.fulfill({ json, response })
  })
  return sent
}

/**
 * Signs in as unit 2's leader and opens their patrols from their own list.
 * @param page The page to walk.
 */
async function openPatrols(page: Page): Promise<void> {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await page.getByRole("link", { name: "Patruller" }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Patruller" })).toBeVisible()
}

test("carries a scout into a patrol and saves only what changed", async ({ page }) => {
  const sent = await answerPatrolWrites(page)
  await openPatrols(page)
  await expect(page.getByRole("status")).toHaveText("15 av 37 scouter i en patrull")

  // Picked up, carried down past the page's edge while it scrolls, and put down on the
  // third patrol.
  const tray = page.getByRole("list", { name: "Utan patrull" })
  const chip = tray.getByRole("listitem").filter({ hasText: "Cornelia Holm" })
  // A press is aimed at a place on the screen, and while the screen's view transition
  // runs that place is the transition's picture rather than the chip.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  )
  const from = await chip.boundingBox()
  expect(from).not.toBeNull()
  await page.mouse.move((from?.x ?? 0) + 30, (from?.y ?? 0) + 20)
  await page.mouse.down()
  await page.mouse.move((from?.x ?? 0) + 60, (from?.y ?? 0) + 40, { steps: 5 })
  const third = page.getByRole("region", { name: "Patrull 3" })
  const height = page.viewportSize()?.height ?? 720
  await page.mouse.move((from?.x ?? 0) + 60, height - 4, { steps: 10 })
  await expect(third).toBeInViewport({ ratio: 0.9 })
  const to = await third.boundingBox()
  await page.mouse.move((to?.x ?? 0) + 100, (to?.y ?? 0) + 40, { steps: 10 })
  await page.mouse.up()

  await expect(third.getByRole("listitem").filter({ hasText: "Cornelia Holm" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText(
    "16 av 37 scouter i en patrull · 1 ändring att spara",
  )

  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  expect([...sent]).toEqual([["1300502", { patrol: "Patrull 3" }]])
})

test("moves a scout from their menu without dragging, and forgets it again", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()

  const falkarna = page.getByRole("region", { name: "Falkarna" })
  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toBeVisible()
  await expect(page.getByRole("status")).toContainText("1 ändring att spara")

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await page.getByRole("menuitem", { name: "Ångra ändringarna" }).click()

  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toHaveCount(0)
  await expect(page.getByRole("status")).toHaveText("15 av 37 scouter i en patrull")
})

test("renames a patrol, which writes each of its people", async ({ page }) => {
  const sent = await answerPatrolWrites(page)
  await openPatrols(page)

  await page.getByRole("textbox", { name: "Namn på patrull 2" }).fill("Uttrarna ")
  await page.getByRole("textbox", { name: "Namn på patrull 2" }).fill("Bävrarna")
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  expect(sent.values().toArray()).toEqual(Array.from({ length: 9 }, () => ({ patrol: "Bävrarna" })))
})

test("refuses to save two patrols under one name", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("textbox", { name: "Namn på patrull 3" }).fill("falkarna")

  await expect(page.getByRole("alert")).toContainText("Två patruller heter Falkarna")
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)
})

test("says who could not be saved, and keeps them to save again", async ({ page }) => {
  await answerPatrolWrites(page, ["1300502"])
  await openPatrols(page)

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await page.getByRole("menuitem", { name: "Fördela resten" }).click()
  await expect(page.getByRole("status")).toContainText("37 av 37 scouter i en patrull")
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("alert")).toHaveText(
    "Det gick inte att spara för Cornelia Holm. Resten är sparat – försök igen.",
  )
  await expect(page.getByRole("status")).toContainText("1 ändring att spara")
})

test("picks several scouts and moves them together from the bar", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()
  await page.getByRole("button", { name: "Välj Greta Palm" }).click()
  const bar = page.getByRole("region", { name: "Valda" })
  await expect(bar).toContainText("2 valda")

  await bar.getByRole("button", { name: "Till Uttrarna" }).click()

  const uttrarna = page.getByRole("region", { name: "Uttrarna" })
  await expect(uttrarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toBeVisible()
  await expect(uttrarna.getByRole("listitem").filter({ hasText: "Greta Palm" })).toBeVisible()
  await expect(bar).toHaveCount(0)
  await expect(page.getByRole("status")).toContainText("2 ändringar att spara")
})

test("carries everybody picked when one of them is carried", async ({ page }) => {
  await openPatrols(page)
  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()
  await page.getByRole("button", { name: "Välj Greta Palm" }).click()

  const falkarna = page.getByRole("region", { name: "Falkarna" })
  const chip = page.getByRole("listitem").filter({ hasText: "Greta Palm" })
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  )
  const from = await chip.boundingBox()
  await page.mouse.move((from?.x ?? 0) + 40, (from?.y ?? 0) + 20)
  await page.mouse.down()
  await page.mouse.move((from?.x ?? 0) + 70, (from?.y ?? 0) + 40, { steps: 5 })
  await expect(page.locator(".patrols-carried")).toContainText("+1")
  // Held at the edge until the patrol's top comes into view, then brought back up, which
  // stops the scroll before it carries the patrol past.
  const height = page.viewportSize()?.height ?? 720
  await page.mouse.move((from?.x ?? 0) + 70, height - 4, { steps: 10 })
  await expect
    .poll(async () => {
      const box = await falkarna.boundingBox()
      return box?.y ?? height
    })
    .toBeLessThan(height - 200)
  await page.mouse.move((from?.x ?? 0) + 70, height / 2, { steps: 5 })
  const to = await falkarna.boundingBox()
  await page.mouse.move((to?.x ?? 0) + 100, (to?.y ?? 0) + 40, { steps: 10 })
  await page.mouse.up()

  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toBeVisible()
  await expect(falkarna.getByRole("listitem").filter({ hasText: "Greta Palm" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Välj Greta Palm" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
})

test("shows a scout's care over the patrols, and weighs each patrol by it", async ({ page }) => {
  await openPatrols(page)
  const falkarna = page.getByRole("region", { name: "Falkarna" })
  await expect(falkarna.getByRole("definition").filter({ hasText: "Allergi 1" })).toBeVisible()

  await page.getByRole("button", { name: "Hälsa och kost för Molly Sundqvist: Allergi" }).click()

  const popover = page.getByRole("dialog", { name: "Molly Sundqvist – hälsa och kost" })
  await expect(popover).toBeVisible()
  await expect(popover).toContainText("Kost och allergier")
  await expect(popover).toContainText("anafylaxi")

  await page.keyboard.press("Escape")
  await expect(popover).toBeHidden()
  await expect(page.getByRole("status")).toHaveText("15 av 37 scouter i en patrull")

  // Again from the cache the application keeps between visits, which holds what the
  // records were read as, not what they were read into.
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Hälsa och kost för Molly Sundqvist: Allergi" }),
  ).toBeVisible()
})

test("keeps the leaders off the chips, and says which patrol lacks one", async ({ page }) => {
  await openPatrols(page)

  await expect(
    page.getByRole("list", { name: "Utan patrull" }).getByText("Anders Andersson"),
  ).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Patrull 3" })).toContainText("Ledare saknas")
  await expect(page.getByRole("region", { name: "Falkarna" })).not.toContainText("Ledare saknas")
})

test("picks a leader for a patrol, and swaps two leaders when one is taken", async ({ page }) => {
  await openPatrols(page)
  const falkarna = page.getByRole("combobox", { name: "Ledare för Falkarna" })
  const uttrarna = page.getByRole("combobox", { name: "Ledare för Uttrarna" })
  const third = page.getByRole("combobox", { name: "Ledare för Patrull 3" })

  await third.selectOption({ label: "Anders Andersson" })
  await expect(page.getByRole("region", { name: "Patrull 3" })).not.toContainText("Ledare saknas")

  await falkarna.selectOption({ label: "Göran Malmberg – byter med Uttrarna" })

  await expect(falkarna.locator("option:checked")).toHaveText("Göran Malmberg")
  await expect(uttrarna.locator("option:checked")).toHaveText("Birgitta Ros")
  await expect(page.getByRole("status")).toContainText("3 ändringar att spara")
})

test("shows a leader their scouts by patrol on the home screen", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")

  await expect(page.getByRole("heading", { name: "Falkarna" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Uttrarna" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Utan patrull" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Ändra patrullerna" })).toBeVisible()
})

test("groups a divided unit by patrol for the management, and a scout's page names it", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants/units/2")

  await expect(page.getByRole("heading", { level: 2 })).toContainText([
    "Falkarna",
    "Uttrarna",
    "Utan patrull",
  ])

  await page.getByRole("link", { name: /Molly Sundqvist/u }).click()
  await expect(page.getByText("Patrull:")).toBeVisible()
  await expect(page.locator(".person-profile-lines")).toContainText("Falkarna")
})

test("leaves an undivided unit as one list, with nobody's patrol", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants/units/1")

  await expect(page.getByRole("heading", { name: "Personer" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Utan patrull" })).toHaveCount(0)
})
