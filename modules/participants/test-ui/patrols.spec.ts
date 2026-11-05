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
): Promise<Map<string, Record<string, unknown>>> {
  const sent = new Map<string, Record<string, unknown>>()
  await page.route("**/api/project/participants/*/patrol", async (route: Route) => {
    const memberNo = /participants\/(\d+)\/patrol/u.exec(route.request().url())?.[1] ?? ""
    const body = route.request().postDataJSON() as Record<string, unknown>
    if (refuse.includes(memberNo)) {
      await route.fulfill({ json: { detail: "Could not store in Scoutnet." }, status: 502 })
      return
    }
    sent.set(memberNo, body)
    await route.fulfill({ json: body })
  })
  await page.route("**/api/project/participants/troopinfo/*", async (route: Route) => {
    const response = await route.fetch()
    const rows = (await response.json()) as { member_no: number }[]
    const json = rows.map((row) => {
      const stored = sent.get(String(row.member_no))
      return stored === undefined ? row : { ...row, ...stored }
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
  // Installed before the first navigation and left running, so the confirmation's timer is
  // one the walk can run past rather than wait out.
  await page.clock.install()
  const sent = await answerPatrolWrites(page)
  await openPatrols(page)

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
  // Brought back off the edge, which stops the scroll, and aimed only once the patrol has
  // stood still between two reads, because the page scrolls on every frame at the edge.
  await page.mouse.move((from?.x ?? 0) + 60, height / 2, { steps: 5 })
  let to = await third.boundingBox()
  await expect
    .poll(async () => {
      const now = await third.boundingBox()
      const isStill = now?.y === to?.y
      to = now
      return isStill
    })
    .toBe(true)
  // Inside the patrol and clear of both edges, where resting the pointer would scroll again.
  const top = to?.y ?? 0
  const aim = Math.min(Math.max(top + 40, 120), top + (to?.height ?? 0) - 20, height - 120)
  await page.mouse.move((to?.x ?? 0) + 100, aim, { steps: 10 })
  await page.mouse.up()

  await expect(third.getByRole("listitem").filter({ hasText: "Cornelia Holm" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("1 flyttad till Patrull 3.")
  expect(sent.size).toBe(0)

  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  expect([...sent]).toEqual([["1300502", { patrol: "Patrull 3" }]])
  // What was saved stays saved, and in the place it was saved in.
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)
  await expect(third.getByRole("listitem").filter({ hasText: "Cornelia Holm" })).toBeVisible()
  // The confirmation leaves on its own, and the move it followed is not said again.
  await page.clock.runFor(5000)
  await expect(page.getByRole("status")).toHaveText("")
  await page.getByRole("textbox", { name: "Namn på patrull 3" }).fill("Bävrarna")
  await expect(page.getByRole("status")).toHaveText("")
})

test("ends a save when the service has answered, whatever the read after it does", async ({
  page,
}) => {
  await answerPatrolWrites(page)
  await openPatrols(page)
  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()

  // Unanswered, as a read paused with the connection gone would be.
  const { promise: held, resolve: release } = Promise.withResolvers<undefined>()
  await page.route("**/api/project/participants/troopinfo/**", async (route: Route) => {
    await held
    await route.fallback()
  })
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  // Taken away first, or the read let through would outlive the test and fail in teardown.
  await page.unrouteAll({ behavior: "ignoreErrors" })
  release(undefined)
})

test("says who was picked after a save, whose confirmation gives way", async ({ page }) => {
  await answerPatrolWrites(page)
  await openPatrols(page)
  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await page.getByRole("button", { name: "Spara" }).click()
  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await page.getByRole("menuitem", { name: "Välj alla utan patrull" }).click()

  await expect(page.getByRole("status")).toHaveText(/^\d+ vald/u)
  await page.unrouteAll({ behavior: "ignoreErrors" })
})

test("moves a scout from their menu without dragging, and forgets it again", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()

  const falkarna = page.getByRole("region", { name: "Falkarna" })
  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("1 flyttad till Falkarna.")
  await expect(page.getByRole("button", { name: "Välj Elsa Norén" })).toBeFocused()

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await page.getByRole("menuitem", { name: "Ångra ändringarna" }).click()

  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)
  await expect(page.getByRole("status")).toHaveText("Ändringarna är ångrade.")
})

test("stops saying a move once a patrol's name is typed over it", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await expect(page.getByRole("status")).toHaveText("1 flyttad till Falkarna.")

  await page.getByRole("textbox", { name: "Namn på patrull 1" }).fill("Räven")

  await expect(page.getByRole("status")).toHaveText("")
})

test("says what the page's menu did, which the boards only show", async ({ page }) => {
  await openPatrols(page)
  const menu = page.getByRole("button", { name: "Fler åtgärder" })

  await menu.click()
  await page.getByRole("menuitem", { name: "Välj alla utan patrull" }).click()
  await expect(page.getByRole("status")).toHaveText(/^\d+ vald/u)

  await menu.click()
  await page.getByRole("menuitem", { name: "Fördela resten" }).click()
  await expect(page.getByRole("status")).toHaveText("Resten är fördelade.")
})

test("says the same move twice, and asks before leaving what is not saved", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await expect(page.getByRole("status")).toHaveText("1 flyttad till Falkarna.")
  const first = await page.getByRole("status").textContent()
  await page.getByRole("button", { name: "Flytta Cornelia Holm" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await expect(
    page.getByRole("region", { name: "Falkarna" }).getByRole("listitem").filter({
      hasText: "Cornelia Holm",
    }),
  ).toBeVisible()
  expect(await page.getByRole("status").textContent()).not.toBe(first)

  await page.getByRole("button", { name: /^Molly Sundqvist har /u }).click()
  await page.getByRole("link", { name: "Visa allt om Molly" }).click()
  const question = page.getByRole("dialog", { name: "Lämna utan att spara?" })
  await expect(question).toBeVisible()
  await question.getByRole("button", { name: "Avbryt" }).click()
  await expect(page).toHaveURL(/\/patrols/u)

  await page.getByRole("link", { name: "Visa allt om Molly" }).click()
  await page
    .getByRole("dialog", { name: "Lämna utan att spara?" })
    .getByRole("button", { name: "Lämna" })
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "Molly Sundqvist" })).toBeVisible()
})

test("renames a patrol, which writes each of its people", async ({ page }) => {
  const sent = await answerPatrolWrites(page)
  await openPatrols(page)

  // A space after the name it has is no new name, so there is nothing to save.
  await page.getByRole("textbox", { name: "Namn på patrull 2" }).fill("Uttrarna ")
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)
  await page.getByRole("textbox", { name: "Namn på patrull 2" }).fill("Bävrarna")
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  expect(sent.values().toArray()).toEqual(Array.from({ length: 8 }, () => ({ patrol: "Bävrarna" })))
})

test("refuses to save two patrols under one name", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("textbox", { name: "Namn på patrull 3" }).fill("falkarna")

  await expect(page.getByRole("alert")).toContainText("Fler än en patrull heter Falkarna")
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)
})

test("says who could not be saved, and saves only them the second time", async ({ page }) => {
  // Emptied once the first save has failed, so the second one goes through.
  const refused = ["1300502"]
  await answerPatrolWrites(page, refused)
  await openPatrols(page)

  await page.getByRole("button", { name: "Fler åtgärder" }).click()
  await page.getByRole("menuitem", { name: "Fördela resten" }).click()
  await expect(page.getByRole("list", { name: "Utan patrull" }).getByRole("listitem")).toHaveCount(
    0,
  )
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("alert")).toHaveText(
    "Det gick inte att spara för Cornelia Holm. Resten är sparat – försök igen.",
  )

  refused.length = 0
  const again: string[] = []
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/patrol")) {
      again.push(request.url())
    }
  })
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  expect(again).toEqual([expect.stringContaining("/participants/1300502/patrol")])
  await expect(page.getByRole("list", { name: "Utan patrull" }).getByRole("listitem")).toHaveCount(
    0,
  )
})

test("does not claim anything is saved when nothing was", async ({ page }) => {
  await answerPatrolWrites(page, ["1300502"])
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Cornelia Holm" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("alert")).toHaveText(
    "Det gick inte att spara för Cornelia Holm. Försök igen.",
  )
})

test("does not call a save done over a change made while it ran", async ({ page }) => {
  await answerPatrolWrites(page)
  const { promise: held, resolve: release } = Promise.withResolvers<undefined>()
  await page.route("**/api/project/participants/*/patrol", async (route: Route) => {
    await held
    await route.fallback()
  })
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  await page.getByRole("button", { name: "Spara" }).click()
  await expect(page.getByRole("status")).toHaveText("Sparar …")
  await page.getByRole("button", { name: "Flytta Cornelia Holm" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  release(undefined)

  await expect(page.getByRole("status")).toHaveText("1 flyttad till Falkarna.")
  await expect(page.getByRole("button", { name: "Spara" })).toBeVisible()
})

test("says a patrol's name waits for somebody to be in it", async ({ page }) => {
  await openPatrols(page)
  const name = page.getByRole("textbox", { name: "Namn på patrull 3" })

  await name.fill("Bävrarna")
  await expect(page.getByText("Namnet sparas när någon är med i patrullen.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Spara" })).toHaveCount(0)

  await name.press("Enter")
  await expect(name).not.toBeFocused()
})

test("counts only the people a move from the bar moved", async ({ page }) => {
  await openPatrols(page)
  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()
  await page.getByRole("button", { name: "Välj Molly Sundqvist" }).click()
  const bar = page.getByRole("region", { name: "Valda" })

  await bar.getByRole("button", { name: "Till Falkarna" }).click()

  await expect(page.getByRole("status")).toHaveText("1 flyttad till Falkarna.")
})

test("offers the picked only the moves that would move somebody", async ({ page }) => {
  await openPatrols(page)
  const bar = page.getByRole("region", { name: "Valda" })

  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()
  await expect(bar).toContainText("1 vald")
  await expect(bar.getByRole("button", { name: "Ur patrullen" })).toHaveCount(0)
  await expect(bar.getByRole("button", { name: "Till Falkarna" })).toBeVisible()

  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()
  await page.getByRole("button", { name: "Välj Molly Sundqvist" }).click()
  await expect(bar.getByRole("button", { name: "Ur patrullen" })).toBeVisible()
  await expect(bar.getByRole("button", { name: "Till Falkarna" })).toHaveCount(0)
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
  await expect(page.getByRole("status")).toHaveText("2 flyttade till Uttrarna.")
  await expect(page.getByRole("button", { name: "Välj Elsa Norén" })).toBeFocused()
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
  // The edge scroll can still be coasting when the pointer leaves the edge, so the patrol is
  // aimed at only once it has stood still between two frames.
  let settled = await falkarna.boundingBox()
  await expect
    .poll(async () => {
      const now = await falkarna.boundingBox()
      const isStill = now?.y === settled?.y
      settled = now
      return isStill
    })
    .toBe(true)
  // Aimed inside the part of the patrol on screen and clear of the top edge, where resting
  // the pointer would scroll the page again.
  const top = settled?.y ?? 0
  const aim = Math.min(Math.max(top + 40, 120), top + (settled?.height ?? 0) - 20)
  await page.mouse.move((settled?.x ?? 0) + 100, aim, { steps: 10 })
  await page.mouse.up()

  await expect(falkarna.getByRole("listitem").filter({ hasText: "Elsa Norén" })).toBeVisible()
  await expect(falkarna.getByRole("listitem").filter({ hasText: "Greta Palm" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Välj Greta Palm" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
})

test("shows a scout's care over the patrols, and counts no figures from it", async ({ page }) => {
  await openPatrols(page)
  const falkarna = page.getByRole("region", { name: "Falkarna" })
  const care = page.getByRole("button", { name: /^Molly Sundqvist har /u })
  // Only once the care has arrived, or the board has nothing yet to count from.
  await expect(care).toBeVisible()
  await expect(falkarna.getByRole("definition")).toHaveCount(0)

  await care.click()

  const sheet = page.getByRole("dialog", { name: "Molly Sundqvist" })
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText("Kost och allergier")
  await expect(sheet).toContainText("anafylaxi")

  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()

  // Again from the cache the application keeps between visits, which holds what the
  // records were read as, not what they were read into.
  await page.reload()
  await expect(page.getByRole("button", { name: /^Molly Sundqvist har /u })).toBeVisible()
})

test("keeps the leaders out of the patrols", async ({ page }) => {
  await openPatrols(page)
  const board = page.getByRole("main")
  await expect(board.getByRole("list", { name: "Utan patrull" })).toBeVisible()

  // Unit 2's leaders, the one signed in among them, in no patrol and not in the tray.
  for (const leader of ["Anders Andersson", "Birgitta Ros", "Göran Malmberg", "Märta Vall"]) {
    await expect(board).not.toContainText(leader)
  }
})

test("keeps what was saved on the device, though no read after it ever lands", async ({ page }) => {
  // The service takes the write, and every read after it fails, so what the list holds
  // after a reload is only what the save itself put in the stored cache.
  let isSaved = false
  await page.route("**/api/project/participants/*/patrol", async (route: Route) => {
    isSaved = true
    await route.fulfill({ json: route.request().postDataJSON() as Record<string, unknown> })
  })
  await page.route("**/api/project/participants/troopinfo/*", async (route: Route) => {
    await (isSaved ? route.abort() : route.fallback())
  })
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: /^Till Falkarna/u }).click()
  await page.getByRole("button", { name: "Spara" }).click()
  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")

  await page.reload()

  await expect(
    page
      .getByRole("region", { name: "Falkarna" })
      .getByRole("listitem")
      .filter({ hasText: "Elsa Norén" }),
  ).toBeVisible()
})

test("says how full each patrol is on a scout's way into it", async ({ page }) => {
  await openPatrols(page)
  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()

  await expect(page.getByRole("menuitem", { name: /^Till Falkarna/u })).toHaveAccessibleName(
    "Till Falkarna 7 av 9",
  )
  await expect(page.getByRole("menuitem", { name: /^Till Uttrarna/u })).toHaveAccessibleName(
    "Till Uttrarna 8 av 9",
  )
})

test("closes a care sheet with Escape without letting go of who is picked", async ({ page }) => {
  await openPatrols(page)
  await page.getByRole("button", { name: "Välj Elsa Norén" }).click()

  await page.getByRole("button", { name: /^Molly Sundqvist har /u }).click()
  await page.keyboard.press("Escape")

  await expect(page.getByRole("region", { name: "Valda" })).toContainText("1 vald")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("region", { name: "Valda" })).toHaveCount(0)
})

test("shows a food allergy ticked only as Övriga over the patrols", async ({ page }) => {
  await openPatrols(page)

  await page.getByRole("button", { name: /^Ines Roos har /u }).click()

  const sheet = page.getByRole("dialog", { name: "Ines Roos" })
  await expect(sheet).toContainText("Övriga")
  await expect(sheet).toContainText("Kiwi")
  // The questions she left unanswered are the person's page's to say, not the sheet's.
  await expect(sheet).not.toContainText("ej besvarad")
})

test("shows a leader their scouts by patrol on the home screen", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anders Andersson")

  await expect(page.getByRole("heading", { name: "Falkarna" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Uttrarna" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Utan patrull" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Patruller" })).toHaveCount(0)
})

test("groups a divided unit by patrol for the management, and a scout's page names it", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants/groups/2")

  await expect(page.getByRole("heading", { level: 2 })).toContainText([
    "Falkarna",
    "Uttrarna",
    "Utan patrull",
    "Ledare",
  ])

  await page.getByRole("link", { name: /Molly Sundqvist/u }).click()
  await expect(page.getByText("Patrull:")).toBeVisible()
  await expect(page.locator(".person-profile-lines")).toContainText("Falkarna")
})

test("takes a scout out of their patrol and saves them with none", async ({ page }) => {
  const sent = await answerPatrolWrites(page)
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Molly Sundqvist" }).click()
  await page.getByRole("menuitem", { name: "Ur patrullen" }).click()

  await expect(
    page.getByRole("list", { name: "Utan patrull" }).getByRole("listitem").filter({
      hasText: "Molly Sundqvist",
    }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Spara" }).click()

  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")
  // eslint-disable-next-line unicorn/no-null -- null is how the body says no patrol
  expect(sent.values().toArray()).toEqual([{ patrol: null }])
})

test("shows how full a patrol is and its mix of genders", async ({ page }) => {
  await openPatrols(page)
  const third = page.getByRole("region", { name: "Patrull 3" })
  await expect(third.getByRole("img", { name: "0 av 9 scouter" })).toBeVisible()

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Patrull 3" }).click()

  await expect(third.getByRole("img", { name: "1 av 9 scouter" })).toBeVisible()
  await expect(third.getByRole("img", { name: "1 kvinna" })).toBeVisible()
})

test("leaves the patrols to a unit's own leaders", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: "Patruller" })).toHaveCount(0)

  await page.goto("/participants/patrols")

  await expect(page.getByText("Patrullerna delas in av avdelningens egna ledare.")).toBeVisible()
  await expect(page.getByRole("button", { name: /^Flytta /u })).toHaveCount(0)
})

test("names the saved patrol on a scout's page when their record cannot be read again", async ({
  page,
}) => {
  await answerPatrolWrites(page)
  await openPatrols(page)

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Visa Elsa" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Elsa Norén" })).toBeVisible()
  await page.locator(".sidemenu").getByRole("link", { name: "Min avdelning" }).click()
  await page.getByRole("link", { name: "Patruller" }).first().click()

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Till Falkarna" }).click()
  // Before the save, because the save asks for her record again at once.
  await page.route("**/api/project/participants/individual/*", async (route: Route) => {
    await route.abort()
  })
  await page.getByRole("button", { name: "Spara" }).click()
  await expect(page.getByRole("status")).toHaveText("Patrullerna är sparade.")

  await page.getByRole("button", { name: "Flytta Elsa Norén" }).click()
  await page.getByRole("menuitem", { name: "Visa Elsa" }).click()

  await expect(page.locator(".person-profile-lines")).toContainText("Falkarna")
})

test("gives a leader's page no patrol", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants/groups/2")

  await page.getByRole("link", { name: /Anders Andersson/u }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Anders Andersson" })).toBeVisible()
  await expect(page.getByText("Patrull:")).toHaveCount(0)
})

test("leaves an undivided unit as one list, with nobody's patrol", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await page.goto("/participants/groups/1")

  await expect(page.getByRole("heading", { name: "Personer" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Utan patrull" })).toHaveCount(0)
})
