import { expect, test, type Page, type Route } from "@playwright/test"

import { faqFolders } from "../src/data/fetch-faq"

// The handbook and its FAQ, walked as the people who read them – the leaders and the
// contingent management: finding the chapter that changed and reading it through, a page
// published again without a note, searching the handbook and the FAQ at once and landing
// on the passage, reading every change in both, reading an FAQ folder, the management
// opening the editor on the page they are reading, printing the whole handbook,
// downloading it as a PDF, and an address nothing holds. A leader reads it with no way
// into the editor, a person outside the contingent is offered no handbook at all, and
// anyone, signed in or not, the public handbook as a page.
//
// The mock serves a short seeded handbook in the CMS's own shape. The FAQ is read from
// Scouterna's help center by the browser rather than from the back-end, so the mock
// cannot answer it; these walks stand in for the help center with answers written the
// way its editor writes them – inline styles, empty paragraphs, and tables included.

/**
 * When an article was published and last saved, in Swedish time with its offset as the
 * help center writes them.
 */
type Moments = { readonly created_at: string; readonly modified_at: string }

/**
 * Long ago, for an article no walk needs to be news.
 */
const longAgo: Moments = {
  created_at: "2025-10-05T11:30:15+02:00",
  modified_at: "2025-10-05T11:30:15+02:00",
}

/**
 * One article, as the help center sends it.
 * @param id The article's id.
 * @param title The question.
 * @param description The answer, as HTML.
 * @param position Its place in the folder.
 * @param moments When it was published and last saved.
 * @returns The article.
 */
function article(
  id: number,
  title: string,
  description: string,
  position: number,
  moments: Moments = longAgo,
): object {
  return { ...moments, description, id, position, title }
}

/**
 * The moment some days before the walk started, for the help center's answers – the
 * mock dates the handbook's notes the same way, from now, so news always has every age.
 * @param days How many days ago.
 * @returns The moment, as an ISO 8601 instant.
 */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * A moment as the handbook's dates say it, in Swedish time – with the year when it is
 * not this year's, as on screen, or always, as on paper.
 * @param at The moment, as an ISO 8601 instant.
 * @param hasYear Whether the year goes with it whatever year it is, as on paper.
 * @returns The day and the month, such as "23 september", or "15 december 2025".
 */
function dayOf(at: string, hasYear = false): string {
  const timeZone = "Europe/Stockholm"
  const yearOf = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric" })
  const isOtherYear = yearOf.format(new Date(at)) !== yearOf.format(new Date())
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    timeZone,
    ...((hasYear || isOtherYear) && { year: "numeric" }),
  }).format(new Date(at))
}

/**
 * When each page's change note was written, as the mock dates them for this run.
 * @param page Any page of the walk, whose request context reads the CMS.
 * @returns The moments, by the page's slug.
 */
async function notesOf(page: Page): Promise<ReadonlyMap<string, string>> {
  const response = await page.request.get("/services/cms/api/info-page")
  const body = (await response.json()) as { docs: { changeNoteAt: string; slug: string }[] }
  return new Map(body.docs.map((doc) => [doc.slug, new Date(doc.changeNoteAt).toISOString()]))
}

/**
 * When one page's change note was written.
 * @param notes The moments, by slug.
 * @param slug The page.
 * @returns The moment, as an ISO 8601 instant.
 */
function noteOf(notes: ReadonlyMap<string, string>, slug: string): string {
  const at = notes.get(slug)
  if (at === undefined) {
    throw new Error(`The mock's handbook has no page ${slug}`)
  }
  return at
}

/**
 * The day one page's change note was written, as the handbook's dates say it.
 * @param notes The moments, by slug.
 * @param slug The page.
 * @param hasYear Whether the year goes with it, as on paper.
 * @returns The day and the month, such as "23 september".
 */
function noteDay(notes: ReadonlyMap<string, string>, slug: string, hasYear = false): string {
  return dayOf(noteOf(notes, slug), hasYear)
}

/**
 * When a question new this week was published and saved.
 */
const askedThisWeek: Moments = { created_at: daysAgo(3), modified_at: daysAgo(3) }

/**
 * When a question long published was changed – weeks ago, inside the month news lasts.
 */
const changedWeeksAgo: Moments = { created_at: longAgo.created_at, modified_at: daysAgo(18) }

const [travelId, costsId, ...otherIds] = faqFolders

/**
 * The folders the walks read, keyed by id, as the help center sends each.
 */
const folders: ReadonlyMap<number, object> = new Map([
  [
    travelId,
    {
      folder: {
        id: travelId,
        name: "Resa och säkerhet",
        position: 2,
        published_articles: [
          article(
            102,
            "Hur lång är rundresan?",
            '<p dir="ltr">Rundresan är ungefär <strong>två veckor</strong> lång.</p><p><br></p>',
            2,
            askedThisWeek,
          ),
          article(
            101,
            "Vilka arrangerar min resa?",
            '<p><span style="color: rgb(24, 50, 71); font-size: 13px;">Resan arrangeras av kontingentledningen.</span></p>',
            1,
            changedWeeksAgo,
          ),
        ],
      },
    },
  ],
  [
    costsId,
    {
      folder: {
        id: costsId,
        name: "Ansökan och kostnader",
        position: 1,
        published_articles: [
          article(
            201,
            "Hur sker betalningen för lägret?",
            '<p dir="ltr">Betalning sker enligt följande:&nbsp;</p><p dir="ltr"><br></p>' +
              '<table style="width: 100%;"><tbody><tr><td>Deltagare med rundresa</td>' +
              "<td>Deltagare med direktresa</td></tr><tr><td><p>3500 kr i samband med ansökan</p><br></td>" +
              "<td>3500 kr i samband med ansökan<br></td></tr></tbody></table>" +
              '<p>Frågor går till <a href="mailto:support@scouterna.se">support@scouterna.se</a>.</p>' +
              '<p><a href="javascript:alert(1)">Klicka här</a></p>' +
              "<style>p{color:red}</style><script>window.pwned = true</script>" +
              "<ul><li><p>Pass</p><p>Visum</p></li></ul>",
            1,
          ),
        ],
      },
    },
  ],
  ...otherIds.map((id, index): [number, object] => [
    id,
    {
      folder: {
        id,
        name: `Mapp ${String(index + 3)}`,
        position: index + 3,
        published_articles: [],
      },
    },
  ]),
])

/**
 * Answers the help center from the fixture, or refuses every folder while `isDown` says
 * the help center is down.
 * @param page The page whose requests to answer.
 * @param isDown Whether the help center refuses at the moment of the request.
 */
async function serveHelpCenter(page: Page, isDown: () => boolean = () => false): Promise<void> {
  const pattern = "https://support.scouterna.se/support/solutions/folders/*.json"
  await page.unroute(pattern)
  await page.route(pattern, async (route: Route) => {
    const id = Number(/folders\/(\d+)\.json/u.exec(route.request().url())?.[1])
    const folder = folders.get(id)
    if (isDown() || folder === undefined) {
      await route.fulfill({ body: "{}", contentType: "application/json", status: 503 })
      return
    }
    await route.fulfill({ body: JSON.stringify(folder), contentType: "application/json" })
  })
}

test.beforeEach(async ({ page }) => {
  await serveHelpCenter(page)
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
 * The card under a heading on the contents – the handbook's chapters, the FAQ's
 * folders, or a group of hits.
 * @param page The page on the contents.
 * @param title The card's heading.
 * @returns The card's section.
 */
function section(page: Page, title: string): ReturnType<Page["locator"]> {
  return page
    .locator("main .card-section")
    .filter({ has: page.getByRole("heading", { exact: true, level: 2, name: title }) })
}

/**
 * Opens the handbook from the side menu, as a reader on a desktop does.
 * @param page The signed-in page.
 */
async function openHandbook(page: Page): Promise<void> {
  await page.locator(".sidemenu").getByRole("link", { name: "Handbok" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Handbok" })).toBeVisible()
}

test("lists the chapters in reading order, marking the one that changed", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)
  await expect(page).toHaveTitle("Handbok – Campfire")

  // The CMS stores the pages out of order; the contents number the chapters as they
  // are read, each summarized by the pages in it.
  const chapters = section(page, "Handboken").locator("a.row")
  await expect(chapters).toHaveCount(2)
  await expect(chapters.nth(0)).toContainText("01")
  await expect(chapters.nth(0)).toContainText("Välkommen")
  await expect(chapters.nth(0)).toContainText("Vad är handboken? · Kontaktinformation")
  await expect(chapters.nth(1)).toContainText("02")
  await expect(chapters.nth(1)).toContainText("Resa")

  // A chapter with a note from the last month says when, whoever has read it.
  const notes = await notesOf(page)
  await expect(chapters.nth(0).locator("time")).toHaveAttribute(
    "datetime",
    noteOf(notes, "kontaktinformation"),
  )
  await expect(chapters.nth(1).locator("time")).toHaveAttribute(
    "datetime",
    noteOf(notes, "hall-kontakten-under-resan"),
  )
  // Each list says under it that it works without coverage.
  await expect(
    page.getByText("Handboken är nedladdad och fungerar utan täckning på lägret."),
  ).toBeVisible()
  await expect(
    page.getByText("Frågorna är nedladdade och fungerar utan täckning på lägret."),
  ).toBeVisible()

  // The FAQ's folders follow, in the help center's order rather than as it lists them.
  const folders = section(page, "Frågor och svar")
  await expect(folders.locator("a.row").first()).toContainText("Ansökan och kostnader")
  await expect(folders.locator("a.row").nth(1)).toContainText("Resa och säkerhet")
  await expect(folders.locator("a.row").nth(1)).toContainText("2 frågor")

  // A folder with a question new or changed in the last month is marked, as a chapter is.
  await expect(folders.locator("a.row").nth(1).locator("time")).toHaveAttribute(
    "datetime",
    askedThisWeek.created_at,
  )
  await expect(folders.locator("a.row").first()).not.toContainText("Uppdaterad")
})

test("reads a chapter whole, with what changed, and carries on", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)
  await section(page, "Handboken").locator("a.row").filter({ hasText: "Välkommen" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  const main = page.locator("main")

  const notes = await notesOf(page)
  const contact = noteDay(notes, "kontaktinformation")

  // Each page says when its note was written beside its title, in a tint that fades with
  // the note's age, and the date opens the note on the page itself.
  await expect(
    main.getByRole("button", { name: `Uppdaterad ${noteDay(notes, "vad-ar-handboken")}` }),
  ).toHaveClass(/is-recent/u)
  const changed = main.getByRole("button", { name: `Uppdaterad ${contact}` })
  await expect(changed).toHaveClass(/is-fresh/u)
  await expect(changed).toHaveAttribute("aria-expanded", "false")
  const note = main.locator("#kontaktinformation-change")
  await expect(note).toBeHidden()
  await changed.click()
  await expect(changed).toHaveAttribute("aria-expanded", "true")
  await expect(note).toBeVisible()
  await expect(note).toContainText("Ny adress till avdelningssupporten.")
  await changed.click()
  await expect(note).toBeHidden()

  // The outline beside it is every chapter and the FAQ, only the chapter being read opened
  // to its pages and marked.
  const outline = page.locator(".outline-items button")
  await expect(outline).toHaveText([
    "Välkommen",
    "Vad är handboken?",
    "Kontaktinformation",
    "Resa",
    "Frågor och svar",
  ])
  await expect(outline.nth(1)).toHaveClass(/outline-nested/u)

  // Every page is a card, its title the card's heading.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Vad är handboken?",
    "Kontaktinformation",
  ])
  await expect(main.getByRole("link", { name: "wsj.units@scouterna.se" })).toHaveAttribute(
    "href",
    "mailto:wsj.units@scouterna.se",
  )

  await page
    .getByRole("navigation", { name: "Läs vidare" })
    .getByRole("link", { name: /02 · Resa/u })
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()

  // The outline folds the chapter left behind and opens the one now on screen.
  await expect(outline).toHaveText([
    "Välkommen",
    "Resa",
    "Resan till WSJ",
    "Håll kontakten under resan",
    "Frågor och svar",
  ])

  // A jump to a page of the chapter is a step back returns from, to the page before it.
  const travel = main.getByRole("heading", { level: 2, name: "Resan till WSJ" })
  const keepInTouch = main.getByRole("heading", { level: 2, name: "Håll kontakten under resan" })
  await outline.filter({ hasText: /^Resan till WSJ$/u }).click()
  await expect(page).toHaveURL(/#resan-till-wsj$/u)
  await outline.filter({ hasText: /^Håll kontakten under resan$/u }).click()
  await expect(page).toHaveURL(/#hall-kontakten-under-resan$/u)
  await expect(keepInTouch).toBeInViewport()
  await page.goBack()
  await expect(page).toHaveURL(/#resan-till-wsj$/u)
  await expect(travel).toBeInViewport()
  await page.goBack()
  await expect(page).toHaveURL(/\/handbook\/[^/#]+$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeInViewport()

  // A page's own headings sit one level under its title, and a set-apart passage is
  // drawn as a reminder.
  await expect(main.getByRole("heading", { level: 2, name: "Resan till WSJ" })).toBeVisible()
  await expect(main.getByRole("heading", { level: 3, name: "Innan ni åker" })).toBeVisible()
  await expect(main.getByRole("heading", { level: 4, name: "Om något händer" })).toBeVisible()
  await expect(main.locator(".handbook-section .richtext-reminder")).toHaveText(
    "Ring alltid 112 först.",
  )

  // A nested list hangs under the entry before it rather than drawing an empty one.
  const steps = main.locator("ol").first()
  await expect(steps.locator(":scope > li")).toHaveCount(2)
  await expect(steps.locator(":scope > li").first().locator("ul > li")).toHaveText([
    "Sovsäck",
    "Liggunderlag",
  ])
  await expect(main.getByRole("columnheader", { name: "Kanal" })).toBeVisible()
  await expect(main.getByRole("link", { name: "jamboreens webbplats" })).toHaveAttribute(
    "target",
    "_blank",
  )

  // The last chapter leads back, and on into the FAQ, as the outline reads it.
  const onward = page.getByRole("navigation", { name: "Läs vidare" })
  await expect(onward.getByRole("link")).toHaveCount(2)
  await expect(onward.getByRole("link").nth(1)).toContainText("Ansökan och kostnader")
  const previous = onward.getByRole("link", { name: /01 · Välkommen/u })

  // Reached by its "next" link, the chapter's "previous" goes back rather than pushing
  // the chapter before it again, so forward still leads here.
  const depth = await page.evaluate("history.length")
  await previous.click()
  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  expect(await page.evaluate("history.length")).toBe(depth)
  await page.goForward()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
})

test("keeps a change dated once it is no longer news, without the tint", async ({ page }) => {
  await page.goto("/handbook/resa")
  await signInAs(page, "Patrik Ply")
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  const notes = await notesOf(page)
  const main = page.locator("main")

  // A note weeks old is still news, faded; one older than the month is only dated.
  await expect(
    main.getByRole("button", {
      name: `Uppdaterad ${noteDay(notes, "hall-kontakten-under-resan")}`,
    }),
  ).toHaveClass(/is-fading/u)
  const settled = main.getByRole("button", {
    name: `Uppdaterad ${noteDay(notes, "resan-till-wsj")}`,
  })
  await expect(settled).toHaveClass(/is-settled/u)
  await settled.click()
  await expect(page.locator("#resan-till-wsj-change")).toContainText(
    "Kontingentens syfte och mål är nya i avsnittet.",
  )
})

/**
 * Stands in for the CMS's page listing with the mock's own answer, two pages of it
 * published again two days ago – one with no note at all, one keeping the note it had.
 * @param page The walk's page.
 * @returns The moment both were published again, as an ISO 8601 instant.
 */
async function serveRevisedHandbook(page: Page): Promise<string> {
  const revisedAt = daysAgo(2)
  await page.route(
    (url) => url.pathname.endsWith("/services/cms/api/info-page"),
    async (route: Route) => {
      const response = await route.fetch()
      const body = (await response.json()) as { docs: Record<string, unknown>[] }
      const pages = body.docs.map((doc) => {
        if (doc["slug"] === "hall-kontakten-under-resan") {
          return { ...doc, changeNote: "", updatedAt: revisedAt }
        }
        return doc["slug"] === "resan-till-wsj" ? { ...doc, updatedAt: revisedAt } : doc
      })
      await route.fulfill({ json: { ...body, docs: pages }, response })
    },
  )
  return revisedAt
}

test("dates a page published again without a note, and lists it as a change for a month", async ({
  page,
}) => {
  const revisedAt = await serveRevisedHandbook(page)
  await page.goto("/handbook/resa")
  await signInAs(page, "Patrik Ply")
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  const main = page.locator("main")
  const updated = `Uppdaterad ${dayOf(revisedAt)}`

  // A page with no note is dated, with nothing to open; one with an older note is dated
  // by its newest publishing, and still opens the note.
  const unnoted = main.locator("#hall-kontakten-under-resan .handbook-change-badge")
  await expect(unnoted).toHaveText(updated)
  await expect(unnoted).toHaveClass(/is-fresh/u)
  await expect(unnoted).not.toHaveRole("button")
  const noted = main.getByRole("button", { name: updated })
  await expect(noted).toHaveClass(/is-fresh/u)
  await noted.click()
  await expect(page.locator("#resan-till-wsj-change")).toContainText(
    "Kontingentens syfte och mål är nya i avsnittet.",
  )

  // In the change log, each publishing is a row of its own, the one without a note
  // saying only where the page is.
  await page.goto("/handbook?visa=andringslogg")
  const rows = page
    .locator("main a.row")
    .filter({ has: page.locator(`time[datetime="${revisedAt}"]`) })
  await expect(rows.locator("strong")).toHaveText(["Resan till WSJ", "Håll kontakten under resan"])
  await expect(rows.locator("small")).toHaveText(["Resa", "Resa"])
  await expect(page.locator("main a.row strong").filter({ hasText: "Resan till WSJ" })).toHaveCount(
    2,
  )
})

test("lists every change in both, by how long ago it happened, each opening where it is", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)
  const notes = await notesOf(page)

  // The count is the last week's: a page noted today and a question published this week.
  const view = page.getByRole("group", { name: "Visa" })
  const changes = view.getByRole("button", { name: /^Ändringslogg/u })
  await expect(changes).toHaveAccessibleName(/2 nya eller ändrade den senaste veckan$/u)
  await changes.click()
  await expect(page).toHaveURL(/\?visa=andringslogg$/u)
  await expect(section(page, "Handboken")).toHaveCount(0)

  // Pages and questions together, newest first, under how long ago they happened – a
  // note however old, and a question published long ago and never changed not at all.
  await expect(page.locator("main .card-title")).toHaveText([
    "Senaste dygnet",
    "Senaste veckan",
    "Senaste månaden",
    "Äldre",
  ])
  const items = page.locator("main a.row")
  await expect(items.locator("strong")).toHaveText([
    "Kontaktinformation",
    "Hur lång är rundresan?",
    "Vad är handboken?",
    "Vilka arrangerar min resa?",
    "Håll kontakten under resan",
    "Resan till WSJ",
  ])

  // Each row says where it is: a page under its chapter's number with the editor's note,
  // a question under the FAQ's mark with what happened to it.
  await expect(items.nth(0).locator(".handbook-tile")).toHaveText("01")
  await expect(items.nth(0).locator("small")).toHaveText(
    "Välkommen · Ny adress till avdelningssupporten.",
  )
  await expect(items.nth(1).locator("small")).toHaveText("Resa och säkerhet · Ny fråga")
  await expect(items.nth(1).locator("time")).toHaveAttribute("datetime", askedThisWeek.created_at)
  await expect(items.nth(3).locator("small")).toHaveText("Resa och säkerhet · Svaret är ändrat")
  await expect(items.nth(5).locator("time")).toHaveAttribute(
    "datetime",
    noteOf(notes, "resan-till-wsj"),
  )

  // The choice is in the address, so it survives a reload.
  await page.reload()
  await expect(items).toHaveCount(6)

  // A question opens in its folder, a page on its section.
  await items.nth(1).click()
  await expect(page).toHaveURL(/\/handbook\/faq\/\d+#102$/u)
  await page.goBack()
  await items.nth(5).click()
  await expect(page).toHaveURL(/\/handbook\/resa#resan-till-wsj$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await page.goBack()
  await view.getByRole("button", { name: "Allt" }).click()
  await expect(section(page, "Handboken")).toBeVisible()
})

test("hands the handbook out as a PDF made on the device", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  const entry = page.getByRole("menuitem", { name: "Ladda ner handboken (PDF)" })
  const downloading = page.waitForEvent("download")
  await entry.click()
  const download = await downloading

  // The entry says how it went before the menu closes, and the file is a real PDF.
  await expect(page.getByRole("menu")).toContainText("Nedladdad")
  expect(download.suggestedFilename()).toBe("Handboken.pdf")
  const chunks: Buffer[] = []
  const stream = await download.createReadStream()
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  const file = Buffer.concat(chunks)
  expect(file.subarray(0, 5).toString("latin1")).toBe("%PDF-")
  // At least the cover, the contents, the change log, and a sheet for each chapter.
  expect(file.toString("latin1").match(/\/Type \/Page\b/gu)?.length).toBeGreaterThanOrEqual(5)
})

test("finds a text anywhere in the handbook and opens its passage", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  const field = page.getByRole("searchbox", { name: "Sök i handboken och bland frågorna" })
  await field.fill("discord")
  await expect(section(page, "I handboken").locator(".card-aside")).toHaveText(
    "1 träff i 1 kapitel",
  )
  await expect(section(page, "I frågor och svar")).toHaveCount(0)
  const hits = section(page, "I handboken").getByRole("link")
  await expect(hits).toHaveCount(1)
  // A hit is a row as the contents' are: its chapter's number, the page, and the quote.
  await expect(hits.first().locator(".handbook-tile")).toHaveText("02")
  await expect(hits.first().locator("strong")).toHaveText("Håll kontakten under resan")
  await expect(hits.first().locator("mark")).toHaveText("Discord")

  // The search is in the address, so it survives a reload.
  await expect(page).toHaveURL(/\?q=discord$/u)
  await page.reload()
  await expect(field).toHaveValue("discord")

  await hits.first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await expect(page).toHaveURL(/\/handbook\/resa#hall-kontakten-under-resan$/u)
  await expect(
    page.getByRole("heading", { level: 2, name: "Håll kontakten under resan" }),
  ).toBeInViewport()
})

test("says so when nothing matches the search", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  await page.getByRole("searchbox", { name: "Sök i handboken och bland frågorna" }).fill("zebra")
  await expect(page.getByRole("status")).toHaveText(
    "Inget i handboken eller bland frågorna matchar ”zebra”.",
  )
})

test("opens the CMS's editor on the exact page the management is reading", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  // The way to ask is the unit leaders', so the management is not offered it.
  await expect(page.getByRole("button", { name: "Ställ en fråga" })).toHaveCount(0)

  // On the contents, the menu opens the CMS's list of every page. The mock has no
  // editor, so the address the new tab opens is the whole proof.
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem")).toHaveText([
    "Ladda ner handboken (PDF)",
    "Redigera handboken",
  ])
  const listed = page.waitForEvent("popup")
  await page.getByRole("menuitem", { name: "Redigera handboken" }).click()
  await expect(await listed).toHaveURL(/\/services\/cms\/admin\/collections\/info-page$/u)

  // In a chapter, every page carries its own way into its own editor.
  await section(page, "Handboken").locator("a.row").filter({ hasText: "Resa" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem")).toHaveText(["Ladda ner handboken (PDF)"])
  await page.keyboard.press("Escape")

  const opened = page.waitForEvent("popup")
  await page.getByRole("link", { name: "Redigera ”Håll kontakten under resan” i CMS:et" }).click()
  await expect(await opened).toHaveURL(/\/services\/cms\/admin\/collections\/info-page\/12$/u)
  await expect(
    page.getByRole("link", { name: "Redigera ”Resan till WSJ” i CMS:et" }),
  ).toHaveAttribute("href", "/services/cms/admin/collections/info-page/9")
})

test("offers the handbook to a leader, with no way into the CMS's editor", async ({ page }) => {
  await page.goto("/handbook/resa")
  await signInAs(page, "Lars Lindberg")

  // A leader reads what the handbook is written for, and the editing stays the
  // management's.
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Handbok" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 1, name: "Resa" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Resan till WSJ" })).toBeVisible()
  await expect(page.getByRole("link", { name: /^Redigera/u })).toHaveCount(0)
})

test("opens a page's chapter at the page, from an address naming the page", async ({ page }) => {
  await page.goto("/handbook/kontaktinformation")
  await signInAs(page, "Patrik Ply")

  await expect(page.getByRole("heading", { level: 1, name: "Välkommen" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "Kontaktinformation" })).toBeVisible()
})

test("says so when the address names no chapter", async ({ page }) => {
  await page.goto("/handbook/saknas")
  await signInAs(page, "Patrik Ply")

  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Kapitlet finns inte i handboken.")
})

test("offers no handbook to a person outside the contingent", async ({ page }) => {
  await page.goto("/handbook")
  await signInAs(page, "Olle Ohlsson")

  await expect(page.locator(".sidemenu").getByRole("link", { name: "Handbok" })).toHaveCount(0)
  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
})

test("leaves the printing of every other screen alone", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  const title = page.getByRole("heading", { level: 1 })
  await expect(title).toBeVisible()

  // The handbook's copy takes the paper only where it is in the page, so a screen that
  // holds none still prints itself.
  await expect(page.locator(".printed-handbook")).toHaveCount(0)
  await page.emulateMedia({ media: "print" })
  await expect(title).toBeVisible()
})

test("prints the whole handbook, and nothing of the screen", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  // The menu offers the PDF rather than printing, so paper is the browser's own command.
  await page.getByRole("button", { name: "Fler åtgärder" }).first().click()
  await expect(page.getByRole("menuitem", { name: /Skriv ut/u })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await expect(page.locator(".printed-handbook")).toBeHidden()
  await page.emulateMedia({ media: "print" })
  const printed = page.locator(".printed-handbook")
  await expect(printed).toBeVisible()
  await expect(page.locator(".sidemenu")).toBeHidden()
  await expect(printed.getByRole("heading", { level: 1, name: "Handboken" })).toBeVisible()
  await expect(printed.locator(".printed-chapter > h1")).toHaveText([
    "Välkommen",
    "Resa",
    "Frågor och svar",
  ])
  await expect(printed.getByRole("heading", { level: 2, name: "Ändringslogg" })).toBeVisible()
  await expect(printed.locator(".printed-question > h3").first()).toHaveText(
    "Hur sker betalningen för lägret?",
  )
})

test("offers the public handbook to anyone, as a page to jump around in", async ({ page }) => {
  // Nobody signs in – the address opens the handbook straight away, without the gate.
  await page.goto("/public/handbook/leaders")
  await expect(page).toHaveTitle("Handboken – Den svenska kontingenten för WSJ27")
  await expect(page.getByRole("button", { name: "Logga in med ScoutID" })).toHaveCount(0)
  await expect(page.locator(".sidemenu")).toHaveCount(0)

  // One page, set as the application sets a chapter, with only the pages the CMS
  // publishes publicly – the handbook alone, without the FAQ, and its change log last.
  const content = page.locator(".public-content")
  await expect(page.getByRole("heading", { level: 1, name: "Handboken" })).toBeVisible()
  await expect(content.locator(".public-part-title")).toHaveText([
    "Välkommen",
    "Resa",
    "Ändringslogg",
  ])
  await expect(content.getByRole("heading", { name: "Kontaktinformation" })).toHaveCount(0)
  await expect(content.getByRole("heading", { name: "Håll kontakten under resan" })).toBeVisible()
  await expect(page.getByText("Hur lång är rundresan?")).toHaveCount(0)
  // Nobody is signed in, so nobody is offered the editor.
  await expect(page.getByRole("link", { name: /^Redigera/u })).toHaveCount(0)

  // The contents stand beside the page: every part, the one being read open – the first,
  // at the top – and a jump opens the part it lands in, marks where the reader is, and
  // names the place in the address.
  const contents = page.locator(".public-outline")
  await expect(contents.getByRole("button")).toHaveText([
    "Välkommen",
    "Vad är handboken?",
    "Resa",
    "Ändringslogg",
  ])
  await contents.getByRole("button", { exact: true, name: "Resa" }).click()
  await expect(page).toHaveURL(/\/public\/handbook\/leaders#kapitel-resa$/u)
  await expect(content.locator("#kapitel-resa")).toBeInViewport()
  await expect(contents.getByRole("button")).toHaveText([
    "Välkommen",
    "Resa",
    "Resan till WSJ",
    "Håll kontakten under resan",
    "Ändringslogg",
  ])
  await expect(contents.getByRole("button", { name: "Resan till WSJ" })).toHaveAttribute(
    "aria-current",
    "true",
  )
  await contents.getByRole("button", { name: "Håll kontakten under resan" }).click()
  await expect(page).toHaveURL(/#hall-kontakten-under-resan$/u)
  await expect(
    content.getByRole("heading", { name: "Håll kontakten under resan" }),
  ).toBeInViewport()

  // The change log lists the public pages' changes by how long ago they happened, and
  // each leads to its page here rather than into the application.
  await contents.getByRole("button", { name: "Ändringslogg" }).click()
  await expect(page).toHaveURL(/#andringslogg$/u)
  const log = content.locator("#andringslogg")
  await expect(log.locator(".card-title")).toHaveText(["Senaste månaden", "Äldre"])
  await expect(log.locator("a.row strong")).toHaveText([
    "Vad är handboken?",
    "Håll kontakten under resan",
    "Resan till WSJ",
  ])
  await log.locator("a.row").filter({ hasText: "Resan till WSJ" }).click()
  await expect(page).toHaveURL(/\/public\/handbook\/leaders#resan-till-wsj$/u)
  await expect(
    content.locator("#resan-till-wsj").getByRole("heading", { name: "Resan till WSJ" }),
  ).toBeInViewport()

  // The handbook downloads as the same PDF the application makes.
  const downloading = page.waitForEvent("download")
  await page.getByRole("button", { name: "Ladda ner som PDF" }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe("Handboken.pdf")

  // Printing puts the printed copy on paper rather than the page: its cover, its
  // contents, and its chapters, each noted page saying when it changed.
  const printed = page.locator(".printed-handbook")
  await expect(printed).toBeHidden()
  await page.emulateMedia({ media: "print" })
  await expect(printed).toBeVisible()
  await expect(content).toBeHidden()
  await expect(printed.locator(".printed-chapter > h1")).toHaveText(["Välkommen", "Resa"])
  const notes = await notesOf(page)
  await expect(printed.locator(".printed-changed")).toHaveText(
    ["vad-ar-handboken", "resan-till-wsj", "hall-kontakten-under-resan"].map(
      (slug) => `Uppdaterad ${noteDay(notes, slug, true)}`,
    ),
  )
})

test("leads an address that names no handbook on to the leaders', in its own color", async ({
  page,
}) => {
  await page.goto("/public/handbook#kapitel-resa")
  await expect(page).toHaveURL(/\/public\/handbook\/leaders#kapitel-resa$/u)
  await expect(page.locator(".public-content #kapitel-resa")).toBeInViewport()

  // The public handbook is always red, whatever color the application would wear.
  await expect(page.locator(".public-header .logo")).toHaveAttribute("src", /logo-red/u)
  await expect(page.locator(".public-handbook").locator("xpath=..")).toHaveAttribute(
    "data-theme",
    "red",
  )
})

test("opens the public handbook's contents in a sheet where there is no room beside it", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 })
  await page.goto("/public/handbook/leaders")
  await expect(page.locator(".public-outline")).toBeHidden()

  // Every part is open in the sheet, since it is there to jump from.
  await page.getByRole("button", { name: "Innehåll" }).click()
  const sheet = page.getByRole("dialog", { name: "Innehåll" })
  await expect(sheet.getByRole("button", { name: "Håll kontakten under resan" })).toBeVisible()
  await sheet.getByRole("button", { name: "Håll kontakten under resan" }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page).toHaveURL(/#hall-kontakten-under-resan$/u)
  await expect(
    page.locator(".public-content").getByRole("heading", { name: "Håll kontakten under resan" }),
  ).toBeInViewport()
})

test("opens the public handbook straight into the print dialog, from ?pdf", async ({ page }) => {
  // The dialog itself is the browser's, so the walk counts the calls in its place.
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "print", {
      value: () => {
        const root = document.documentElement
        root.dataset["printed"] = String(Number(root.dataset["printed"] ?? "0") + 1)
      },
    })
  })
  await page.goto("/public/handbook/leaders?pdf")
  await expect(page.locator(".public-part").first()).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-printed", "1")
})

test("finds a text in the handbook and the FAQ at once, saying where each is", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  await page.getByRole("searchbox", { name: "Sök i handboken och bland frågorna" }).fill("rundresa")

  const fromFaq = section(page, "I frågor och svar").getByRole("link")
  await expect(fromFaq.first().locator("strong")).toHaveText("Hur sker betalningen för lägret?")
  await expect(fromFaq.first().locator("mark").first()).toHaveText(/rundresa/iu)
  await expect(section(page, "I frågor och svar").locator(".card-aside")).toHaveText(/träff/u)

  await section(page, "I frågor och svar")
    .getByRole("link", { name: /Hur lång är rundresan\?/u })
    .first()
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "Resa och säkerhet" })).toBeVisible()
  await expect(page).toHaveURL(/\/handbook\/faq\/\d+#102$/u)
  await expect(
    page.getByRole("heading", { level: 2, name: "Hur lång är rundresan?" }),
  ).toBeInViewport()
})

test("reads an FAQ folder as one document, its answers drawn in Campfire's type", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)
  await section(page, "Frågor och svar")
    .getByRole("link", { name: /Resa och säkerhet/u })
    .click()

  await expect(page.getByRole("heading", { level: 1, name: "Resa och säkerhet" })).toBeVisible()
  // The printed copy is in the page too, so the screen's own text is read from the cards.
  const main = page.locator("main .handbook-faq-question")
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    "Vilka arrangerar min resa?",
    "Hur lång är rundresan?",
  ])
  // Each question changed in the last month says how, and when, in a tint that fades with
  // the change's age.
  await expect(main.locator(".card-aside")).toHaveText([
    `Uppdaterad ${dayOf(changedWeeksAgo.modified_at)}`,
    `Ny ${dayOf(askedThisWeek.created_at)}`,
  ])
  await expect(main.locator(".handbook-change-badge")).toHaveClass([/is-fading/u, /is-fresh/u])

  // The editor's pasted styles are gone, and its emphasis is kept.
  await expect(main.getByText("Resan arrangeras av kontingentledningen.")).not.toHaveAttribute(
    "style",
  )
  await expect(main.locator("strong", { hasText: "två veckor" })).toBeVisible()
  // The way to ask is the unit leaders', so the management is not offered it here either.
  await expect(page.getByRole("button", { name: "Ställ en fråga" })).toHaveCount(0)

  // The outline opens the FAQ to its folders, the chapters closed, and marks the folder.
  await expect(page.locator(".outline-items button")).toHaveText([
    "Välkommen",
    "Resa",
    "Frågor och svar",
    "Ansökan och kostnader",
    "Resa och säkerhet",
    ...otherIds.map((_, index) => `Mapp ${String(index + 3)}`),
  ])
  await expect(page.locator('.outline-items button[aria-current="true"]')).toHaveText(
    "Resa och säkerhet",
  )

  // Under the last question, the folders either side, as in a chapter.
  const onward = page.getByRole("navigation", { name: "Läs vidare" })
  await expect(onward.getByRole("link")).toHaveText([
    /Föregående\s*Ansökan och kostnader/u,
    /Nästa\s*Mapp 3/u,
  ])

  // Reading the folder does not unmark it – news lasts its month for every reader.
  await page.goBack()
  await expect(
    section(page, "Frågor och svar").getByRole("link", { name: /Resa och säkerhet/u }),
  ).toContainText("Uppdaterad")
})

test("an answer keeps its table and its links, and drops a link that is not one", async ({
  page,
}) => {
  await page.goto(`/handbook/faq/${String(costsId)}`)
  await signInAs(page, "Patrik Ply")

  const main = page.locator("main .handbook-faq-question")
  await expect(main.getByRole("cell", { name: "Deltagare med direktresa" })).toBeVisible()
  // A question long past news is still dated, by when it was published, without the tint.
  await expect(main.locator(".card-aside")).toHaveText(`Publicerad ${dayOf(longAgo.created_at)}`)
  await expect(main.locator(".handbook-change-badge")).toHaveClass(/is-settled/u)
  await expect(main.getByRole("link", { name: "support@scouterna.se" })).toHaveAttribute(
    "href",
    "mailto:support@scouterna.se",
  )
  await expect(main.getByText("Klicka här")).toBeVisible()
  await expect(main.getByRole("link", { name: "Klicka här" })).toHaveCount(0)
  // A stylesheet or a script pasted in with the text is neither run nor read out, and
  // two paragraphs in one entry of a list stay two lines.
  await expect(main).not.toContainText("color:red")
  await expect(main).not.toContainText("pwned")
  expect(await page.evaluate(() => "pwned" in globalThis)).toBe(false)
  await expect(main.getByRole("listitem").locator("br")).toHaveCount(1)
  expect(await main.getByRole("listitem").innerText()).toMatch(/^Pass\s+Visum$/u)
})

test("keeps the handbook when the FAQ cannot be read, and asks again", async ({ page }) => {
  let isDown = true
  await serveHelpCenter(page, () => isDown)
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await openHandbook(page)

  await expect(section(page, "Handboken").locator("a.row")).toHaveCount(2)
  const faq = section(page, "Frågor och svar")
  await expect(faq.getByRole("status")).toHaveText("Frågorna kunde inte hämtas.")

  // A search says the FAQ was not searched rather than that nothing in it matched.
  const field = page.getByRole("searchbox", { name: "Sök i handboken och bland frågorna" })
  await field.fill("discord")
  await expect(page.getByText("Frågorna kunde inte hämtas och söktes inte.")).toBeVisible()
  await field.fill("")

  isDown = false
  await faq.getByRole("button", { name: "Försök igen" }).click()
  await expect(faq.getByRole("link", { name: /Resa och säkerhet/u })).toBeVisible()
})

test("says so when the address names no FAQ folder", async ({ page }) => {
  await page.goto("/handbook/faq/gone")
  await signInAs(page, "Patrik Ply")

  await expect(page.getByRole("heading", { level: 1, name: "Sidan finns inte" })).toBeVisible()
  await page.getByRole("link", { name: "Till handboken" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Handbok" })).toBeVisible()
})

/**
 * The keys the application has kept its answers under on this device.
 * @param page The signed-in page.
 * @returns The keys of the persisted queries.
 */
async function keptQueries(page: Page): Promise<readonly string[]> {
  return page.evaluate<string[]>(readKeptKeys)
}

// Run in the page as written, because IndexedDB answers through two nested callbacks and
// a script is read by the page alone.
const readKeptKeys = `new Promise((resolve) => {
  const opening = indexedDB.open("campfire")
  opening.onsuccess = () => {
    const keys = opening.result.transaction("queries").objectStore("queries").getAllKeys()
    keys.onsuccess = () => resolve(keys.result.map(String))
  }
})`

test("keeps the handbook, its pictures, and the FAQ on the device before either is opened", async ({
  page,
}) => {
  await page.goto("/")
  await signInAs(page, "Patrik Ply")
  await expect(page.locator(".sidemenu").getByRole("link", { name: "Handbok" })).toBeVisible()

  // Read and kept from the start, with neither ever opened.
  await expect
    .poll(async () => {
      const keys = await keptQueries(page)
      return keys.join(" ")
    })
    .toMatch(/"handbook","pages".*"faq","folders"|"faq","folders".*"handbook","pages"/u)

  // Then the CMS and the help center are out of reach, and the application starts again.
  await page.unroute("https://support.scouterna.se/support/solutions/folders/*.json")
  await page.route("https://support.scouterna.se/**", (route) => route.abort())
  await page.route("**/services/cms/**", (route) => route.abort())
  await page.reload()

  await openHandbook(page)
  await expect(section(page, "Handboken").locator("a.row")).toHaveCount(2)
  await expect(
    section(page, "Frågor och svar").getByRole("link", { name: /Resa och säkerhet/u }),
  ).toBeVisible()

  await section(page, "Handboken").locator("a.row").filter({ hasText: "Resa" }).click()
  const picture = page
    .locator(".handbook-section")
    .getByRole("img", { name: "Energikurvan, ritad över en dag" })
  await expect(picture).toHaveAttribute("src", /^data:image\/webp;base64,/u)
  await expect(picture).toHaveJSProperty("complete", true)
  const width = await picture.evaluate((image: HTMLImageElement) => image.naturalWidth)
  expect(width).toBe(756)

  await page.goto(`/handbook/faq/${String(travelId)}`)
  await expect(
    page.getByRole("heading", { level: 2, name: "Hur lång är rundresan?" }),
  ).toBeVisible()
})
