import { expect, test, type Page } from "@playwright/test"

// The reveal file itself rather than the ui package: the package surface pulls
// component stylesheets along, which the test runner cannot swallow.
// eslint-disable-next-line import-x/no-relative-packages -- see above
import { unitsReveal } from "../../../libraries/ui/src/foundations/reveal/reveals"
import { itinerary, phaseAt, type JourneyPhase } from "../src/model/Journey"

// The journey module's walks: the countdown widget on the start screen, behind the
// units reveal, counting to the signed-in person's own dates. The walks run on the
// real clock, so what the count beside the heading says is read from the same model the
// card reads – the walk asserts the wording for whichever phase today falls in.

// The reveal is timed, and until its moment every widget waits behind the curtain.
// These walks are about the widget once it is open, so each page opens with the
// development bypass set – exactly as a developer works. The one walk about the
// curtain itself takes the bypass back off.
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
 * What the status line leads with today, for a journey with or without the pre-trip –
 * the same decision the card makes, so the walk holds in September 2026 and in August
 * 2027 alike.
 * @param hasPreTrip Whose journey.
 * @returns The leading words to expect.
 */
function statusToday(hasPreTrip: boolean): string {
  const labels: Readonly<Record<JourneyPhase, string>> = {
    ahead: hasPreTrip ? "Avresa om" : "Lägret om",
    camping: "Lägret · dag",
    home: "Jamboreen är över",
    traveling: "Resan · dag",
  }
  return labels[phaseAt(new Date(), itinerary(hasPreTrip))]
}

/**
 * Whether the trip is over today – after the homecoming the dates are history, and the
 * caveat about them stands down.
 * @returns True from the homecoming day on.
 */
function isOverToday(): boolean {
  return phaseAt(new Date(), itinerary(true)) === "home"
}

test("reaches the application at the root address", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("Campfire")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Äventyret\s*börjar här/)
})

test("counts a rundresa leader to the buses, with the pre-trip as its own leg", async ({
  page,
}) => {
  // Desktop width: the legend's three columns, the homecoming among them.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  // The card, under its own heading, counting whatever today calls for.
  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toBeVisible()
  await expect(page.getByText(statusToday(true))).toBeVisible()

  // The road through the Baltics is this person's own leg.
  await expect(page.getByText("Sverige → Lettland → Litauen")).toBeVisible()
  await expect(page.getByText("World Scout Jamboree · Gdańsk")).toBeVisible()
  await expect(page.getByText("10/8")).toBeVisible()

  // On a phone the legs stack rather than drop: the day the buses leave matters as much
  // as the camp's, and only the homecoming stands down.
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText("Resa · 21–28 juli 2027")).toBeVisible()
  await expect(page.getByText("World Scout Jamboree · Gdańsk")).toBeVisible()
  await expect(page.getByText("10/8")).toBeHidden()

  // The dates shown are the contingent's plan rather than this person's own, until the
  // trip is history.
  const caveat = page.getByText("Exakta datum och tider för just dig och din avdelning")
  if (isOverToday()) {
    await expect(caveat).toHaveCount(0)
  } else {
    await expect(caveat).toBeVisible()
  }
})

test("counts a direktresa leader to the camp, with no pre-trip anywhere", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  await signInAs(page, "Anders Andersson")
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()

  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toBeVisible()
  await expect(page.getByText(statusToday(false))).toBeVisible()

  // No bus was booked, so no departure and no road – the journey is the camp.
  await expect(page.getByText("Avresa om")).toHaveCount(0)
  await expect(page.getByText("Sverige → Lettland → Litauen")).toHaveCount(0)
  await expect(page.getByText("World Scout Jamboree · Gdańsk")).toBeVisible()
})

test("counts to the second, and only to the minute on a phone or under reduced motion", async ({
  page,
}) => {
  // Seconds belong to the countdown alone – once the journey has begun the line counts
  // days, and there is nothing finer to hold still.
  test.skip(phaseAt(new Date(), itinerary(true)) !== "ahead", "the countdown is over")

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toBeVisible()
  await expect(page.getByText("sek", { exact: true })).toBeVisible()

  // A phone's heading row has no room for a fourth figure.
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText("sek", { exact: true })).toHaveCount(0)
  await expect(page.getByText("min", { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.getByText("sek", { exact: true })).toBeVisible()

  // The setting is followed live: a figure changing every second is motion too.
  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect(page.getByText("sek", { exact: true })).toHaveCount(0)
  await expect(page.getByText("min", { exact: true })).toBeVisible()
})

test("stops the clock while the card is out of view, and catches up on return", async ({
  page,
}) => {
  // Only the countdown moves by the second – once the journey has begun there is no
  // clock fine enough to catch standing still.
  test.skip(phaseAt(new Date(), itinerary(true)) !== "ahead", "the countdown is over")

  // The page's timers are the walk's to wind, so "nothing was scheduled" is something
  // to observe rather than to wait out.
  await page.clock.install()

  // Wide enough for the seconds, and short enough that the page scrolls the card away.
  await page.setViewportSize({ width: 1280, height: 500 })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  const count = page.getByText("Avresa om")
  await expect(count).toBeVisible()

  // Out of view nothing is scheduled, so the line holds whatever it last said.
  await page.getByRole("heading", { level: 2 }).last().scrollIntoViewIfNeeded()
  await expect(count).not.toBeInViewport()
  // One wind first, so a tick already on its way when the card left has landed before
  // the line is read – what is held after it is held for good.
  await page.clock.fastForward(2000)
  const held = await count.textContent()
  await page.clock.fastForward(5000)
  expect(await count.textContent()).toBe(held)

  // Back in view it is on the clock again, without waiting out a step.
  await count.scrollIntoViewIfNeeded()
  await expect(count).not.toHaveText(held ?? "")
})

test("keeps the countdown behind the curtain until the reveal", async ({ page }) => {
  // Once the moment has passed – for real, or moved for a rehearsal – there is no
  // curtain left to walk, and the walk stands down rather than failing.
  test.skip(Date.now() >= unitsReveal.at.getTime(), "the reveal moment has passed")

  // The bypass the other walks set is taken back off, so this page stands where a
  // real leader stands before the moment.
  await page.addInitScript(() => {
    localStorage.removeItem("campfire-reveal")
  })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // The reveal's own countdown holds the room, and the journey's card is nowhere.
  await expect(page.getByText("Lördag 19 september 19.30")).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toHaveCount(0)
})
