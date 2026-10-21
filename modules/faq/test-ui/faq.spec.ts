import { expect, test, type Page, type Route } from "@playwright/test"

import { faqFolders } from "../src/data/fetch-faq"

// The FAQ is read from Scouterna's help center by the browser rather than from the
// back-end, so the mock cannot answer it. These walks stand in for the help center with
// answers written the way its editor writes them – inline styles, empty paragraphs, and
// tables included – so none of them depends on what the real help center holds today.

/**
 * One article, as the help center sends it.
 * @param id The article's id.
 * @param title The question.
 * @param description The answer, as HTML.
 * @param position Its place in the folder.
 * @returns The article.
 */
function article(id: number, title: string, description: string, position: number): object {
  return { description, id, position, title }
}

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
          ),
          article(
            101,
            "Vilka arrangerar min resa?",
            '<p><span style="color: rgb(24, 50, 71); font-size: 13px;">Resan arrangeras av kontingentledningen.</span></p>',
            1,
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
              '<p><a href="javascript:alert(1)">Klicka här</a></p>',
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

test("the section lists the folders in the help center's order", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: "Frågor och svar", exact: true }).first().click()

  await expect(page.getByRole("heading", { level: 1, name: "Frågor och svar" })).toBeVisible()
  const rows = page.getByRole("link", { name: /Ansökan och kostnader|Resa och säkerhet/u })
  await expect(rows.first()).toHaveAccessibleName(/Ansökan och kostnader/u)
  await expect(page.getByRole("link", { name: /Resa och säkerhet.*2 frågor/u })).toBeVisible()
})

test("a folder reads as one document, its answers drawn in Campfire's type", async ({ page }) => {
  await page.goto("/faq")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: /Resa och säkerhet/u }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Resa och säkerhet" })).toBeVisible()
  const questions = page.getByRole("heading", { level: 2 })
  await expect(questions).toHaveText(["Vilka arrangerar min resa?", "Hur lång är rundresan?"])
  // The editor's pasted styles are gone, and its emphasis is kept.
  await expect(page.getByText("Resan arrangeras av kontingentledningen.")).not.toHaveAttribute(
    "style",
  )
  await expect(page.locator("strong", { hasText: "två veckor" })).toBeVisible()
})

test("an answer keeps its table and its links, and drops a link that is not one", async ({
  page,
}) => {
  await page.goto("/faq")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: /Ansökan och kostnader/u }).click()

  await expect(page.getByRole("cell", { name: "Deltagare med direktresa" })).toBeVisible()
  await expect(page.getByRole("link", { name: "support@scouterna.se" })).toHaveAttribute(
    "href",
    "mailto:support@scouterna.se",
  )
  await expect(page.getByText("Klicka här")).toBeVisible()
  await expect(page.getByRole("link", { name: "Klicka här" })).toHaveCount(0)
})

test("the search finds an answer in any folder and leads to it", async ({ page }) => {
  await page.goto("/faq")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("searchbox", { name: "Sök bland frågorna" }).fill("kontingentledningen")

  const hit = page.getByRole("link", { name: /Vilka arrangerar min resa\?/u })
  await expect(hit).toBeVisible()
  await hit.click()

  await expect(page.getByRole("heading", { level: 1, name: "Resa och säkerhet" })).toBeVisible()
  await expect(page).toHaveURL(/\/faq\/\d+#101$/u)

  await page.goBack()
  await page.getByRole("searchbox", { name: "Sök bland frågorna" }).fill("finns inte")
  await expect(page.getByRole("status")).toHaveText("Inget bland frågorna matchar ”finns inte”.")
})

test("someone outside the contingent cannot reach the FAQ", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Olle Ohlsson")

  await expect(page.getByRole("link", { name: "Profil för Olle Ohlsson" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Frågor och svar", exact: true })).toHaveCount(0)
})

test("an FAQ that cannot be read says so and offers to try again", async ({ page }) => {
  let isDown = true
  await serveHelpCenter(page, () => isDown)
  await page.goto("/faq")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("status")).toHaveText("Frågorna kunde inte hämtas.")

  isDown = false
  await page.getByRole("button", { name: "Försök igen" }).click()

  await expect(page.getByRole("link", { name: /Resa och säkerhet/u })).toBeVisible()
})

test("an address to a folder that is gone says so", async ({ page }) => {
  await page.goto("/faq/gone")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("heading", { level: 1, name: "Mappen finns inte" })).toBeVisible()
  await page.getByRole("link", { name: "Till frågorna" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Frågor och svar" })).toBeVisible()
})
