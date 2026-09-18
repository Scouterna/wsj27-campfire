import { expect, test, type Locator, type Page } from "@playwright/test"

// The reveal file itself rather than the ui package, as in the home walk: the package
// surface pulls component stylesheets along, which the test runner cannot swallow.
// eslint-disable-next-line import-x/no-relative-packages -- see above
import { unitsReveal } from "../../../libraries/ui/src/foundations/reveal/reveals"
import { closedMessagesKey, messages, type Message } from "../src/model/messages"

// The contingent's messages on the start screen: a welcome for each role, closed
// together, and remembered on the device. A fresh browser context has closed nothing,
// so every walk here opens on the welcome unless it says otherwise – and nothing here
// may clear the stored value from an init script, which would run again on the reload
// the remembering is proved by.

/**
 * The welcome written for one role.
 * @param role The role kind the welcome names as its audience.
 * @returns That welcome.
 */
function welcomeFor(role: Message["audience"][number]): Message {
  const found = messages.find((message) => message.audience.includes(role))
  if (found === undefined) {
    // Every walk below reads the welcome's words; an undefined name would match any
    // heading at all and pass against a screen that showed something else.
    throw new Error(`the message list holds no welcome for ${role}`)
  }
  return found
}

const leaderWelcome = welcomeFor("leader")
const managementWelcome = welcomeFor("cmt")
// One headline for both, so one locator finds either.
const welcomeTitle = leaderWelcome.title

test.beforeEach(async ({ page }) => {
  // The messages wait behind the units reveal like every other widget, so each page
  // opens with the development bypass set, as in the home walk.
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
  await expect(
    page.getByRole("heading", { level: 1, name: "Välkommen", exact: true }),
  ).toBeVisible()
}

/**
 * The way out: the profile control leads to the profile page, which holds the one
 * action that ends the session – back on the sign-in screen at the front door.
 * @param page The page standing anywhere in the signed-in application.
 * @param persona The signed-in persona, as the profile control names them.
 */
async function signOut(page: Page, persona: string): Promise<void> {
  await page.getByRole("link", { name: `Profil för ${persona}` }).click()
  await page.getByRole("button", { name: "Logga ut" }).click()
}

/**
 * The welcome's heading – the plate's own `h2`, so a section the outline lists.
 * @param page The page showing the start screen.
 * @returns The level-two heading carrying the welcome's title.
 */
function welcomeHeading(page: Page): Locator {
  return page.getByRole("heading", { level: 2, name: welcomeTitle })
}

/**
 * The one close control, by the name it carries while the welcome shows alone.
 * @param page The page showing the start screen.
 * @returns The close control.
 */
function closeControl(page: Page): Locator {
  return page.getByRole("button", { name: "Stäng meddelandet" })
}

test("shows the welcome to a leader, over the journey and their unit", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  // Their own welcome – what a leader can do with their unit – and not the management's.
  await expect(welcomeHeading(page)).toBeVisible()
  await expect(page.getByText(leaderWelcome.text)).toBeVisible()
  await expect(page.getByText(managementWelcome.text)).toHaveCount(0)
  await expect(closeControl(page)).toHaveText("Stäng")

  // In the flow with the other widgets, and first among them: over the journey's
  // countdown and the unit – the sections' headings, in document order. Only the first
  // three, because how many cards the unit widget draws is the participants module's
  // business.
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
  const sections = await page.locator("main .content h2").allTextContents()
  expect(sections.slice(0, 3)).toEqual([welcomeTitle, "Resan", "Min avdelning"])
})

test("shows the management a welcome of their own", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  // What the management can do with everyone – and nothing of a single unit's.
  await expect(welcomeHeading(page)).toBeVisible()
  await expect(page.getByText(managementWelcome.text)).toBeVisible()
  await expect(page.getByText(leaderWelcome.text)).toHaveCount(0)
})

test("closes every message at once and leaves no trace", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")
  await expect(welcomeHeading(page)).toBeVisible()

  // One control, however much it closes.
  await expect(page.getByRole("button", { name: /^Stäng/ })).toHaveCount(1)
  await closeControl(page).click()

  // Nothing of it is left: no heading, no text, no control – and for the management,
  // whose start screen holds the journey and nothing else, no second section at all.
  await expect(welcomeHeading(page)).toHaveCount(0)
  await expect(page.getByText(managementWelcome.text)).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Stäng/ })).toHaveCount(0)
  await expect(page.locator("main .content h2")).toHaveText(["Resan"])
})

test("closes from the keyboard", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  await closeControl(page).focus()
  await page.keyboard.press("Enter")

  await expect(welcomeHeading(page)).toHaveCount(0)
})

test("stays closed through a reload and a new sign-in, and closes nobody else's", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")
  await closeControl(page).click()
  await expect(welcomeHeading(page)).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
  await expect(welcomeHeading(page)).toHaveCount(0)

  // A new sign-in on the same device: what was closed is the device's, not the
  // session's.
  await signOut(page, "Lars Lindberg")
  await signInAs(page, "Lars Lindberg")
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
  await expect(welcomeHeading(page)).toHaveCount(0)

  // And somebody from the management on that same device still gets theirs: a leader
  // closed the leaders' welcome, which is a different message.
  await signOut(page, "Lars Lindberg")
  await signInAs(page, "Anna Almgren")
  await expect(page.getByText(managementWelcome.text)).toBeVisible()
})

test("keeps what the device had already closed when it closes more", async ({ page }) => {
  // An id the list no longer holds, as a message since removed would leave behind.
  // Set once and not again on a later load: the walk reads the key back afterwards.
  await page.addInitScript((key) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(["gone"]))
    }
  }, closedMessagesKey)
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await closeControl(page).click()
  await expect(welcomeHeading(page)).toHaveCount(0)

  // Added to, never replaced: a close that wrote only what it closed would forget
  // everything closed before it.
  const stored = await page.evaluate((key) => localStorage.getItem(key), closedMessagesKey)
  expect(JSON.parse(stored ?? "[]")).toEqual(["gone", leaderWelcome.id])
})

test("keeps the welcome behind the curtain until the reveal", async ({ page }) => {
  // Once the moment has passed there is no curtain left to walk, as in the home walk.
  test.skip(Date.now() >= unitsReveal.at.getTime(), "the reveal moment has passed")

  // The bypass the other walks set is taken back off. The welcome says what the
  // reader can do here, and before the reveal none of it is there to do.
  await page.addInitScript(() => {
    localStorage.removeItem("campfire-reveal")
  })
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByText("dagar")).toBeVisible()
  await expect(welcomeHeading(page)).toHaveCount(0)
})

test("shows the welcome again rather than breaking when storage holds nonsense", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "{not json")
  }, closedMessagesKey)
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await expect(welcomeHeading(page)).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
})

test("shows the welcome again rather than breaking when storage refuses to be read", async ({
  page,
}) => {
  // Refusing this one key rather than all of storage: the walk is about the messages'
  // own guard, not about how everything else on the page takes a refusal.
  await page.addInitScript((key) => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- handed its own `this` back below
    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (this: Storage, name: string) {
      if (name === key) {
        throw new DOMException("refused", "SecurityError")
      }
      return getItem.call(this, name)
    }
  }, closedMessagesKey)
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await expect(welcomeHeading(page)).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Min avdelning" })).toBeVisible()
})

test("still closes when storage refuses the write, and shows the welcome next visit", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- handed its own `this` back below
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, name: string, value: string) {
      if (name === key) {
        throw new DOMException("refused", "QuotaExceededError")
      }
      setItem.call(this, name, value)
    }
  }, closedMessagesKey)
  await page.goto("/")
  await signInAs(page, "Anna Almgren")

  await closeControl(page).click()
  await expect(welcomeHeading(page)).toHaveCount(0)

  // Closed for the visit, not only for the screen: leaving the start screen unmounts
  // the plate, and coming back must not bring the welcome with it.
  await page.getByRole("link", { name: "Deltagare" }).first().click()
  await expect(page).toHaveTitle("Deltagare – Campfire")
  await page.getByRole("link", { name: "Hem" }).first().click()
  await expect(page.getByRole("heading", { level: 2, name: "Resan" })).toBeVisible()
  await expect(welcomeHeading(page)).toHaveCount(0)

  await page.reload()
  await expect(welcomeHeading(page)).toBeVisible()
})
