import { expect, test, type Page, type Route } from "@playwright/test"

import { materialFolder } from "../src/data/fetch-material"

// The material is read from Google Drive by the browser rather than from the back-end
// (ADR 038), so the mock cannot answer it. These walks stand in for the Drive API and
// refuse every picture, so none of them depends on Google or on what the real folder
// holds today.

const folderMime = "application/vnd.google-apps.folder"
const png = "image/png"
const svg = "image/svg+xml"

/**
 * A folder entry, as the Drive API sends one.
 * @param id The entry's id.
 * @param name Its name.
 * @returns The entry.
 */
function folder(id: string, name: string): object {
  return { id, mimeType: folderMime, name }
}

/**
 * A file entry, as the Drive API sends one, its size a string of digits.
 * @param name The file's name, from which its id is made.
 * @param mimeType Its media type.
 * @returns The entry.
 */
function file(name: string, mimeType: string): object {
  return { id: `id-${name}`, mimeType, name, size: "12345" }
}

/**
 * The material the walks browse, in the real folder's shape, keyed by the id of the
 * folder each list of entries is inside.
 */
const drive: ReadonlyMap<string, readonly object[]> = new Map([
  [
    materialFolder,
    [
      folder("symbols", "Avdelningssymboler"),
      folder("templates", "mallar till dokument och presentation"),
      folder("fonts", "Typsnitt att använda"),
      file("WSJ27SE_form version 8.pdf", "application/pdf"),
    ],
  ],
  [
    "symbols",
    [
      folder("profiles", "avdelningar - profilbilder"),
      folder("icons", "avdelningsikoner"),
      folder("logos", "avdelningslogotyper"),
    ],
  ],
  ["profiles", [file("abborren_SoMe.png", png), file("björnen_SoMe.png", png)]],
  ["icons", [folder("icons-color", "Färgade"), folder("icons-white", "Icke-färgade (vita)")]],
  [
    "icons-color",
    [folder("icons-color-png", "Pixelfiler (PNG)"), folder("icons-color-svg", "Vektorfiler (SVG)")],
  ],
  ["icons-color-png", [file("björnen_icon_color.png", png)]],
  ["icons-color-svg", [file("björnen_icon_color.svg", svg)]],
  [
    "icons-white",
    [folder("icons-white-png", "Pixelfiler (PNG)"), folder("icons-white-svg", "Vektorfiler (SVG)")],
  ],
  ["icons-white-png", [file("björnen_icon_white.png", png)]],
  ["icons-white-svg", [file("björnen_icon_white.svg", svg), file("ugglan_icon_white.svg", svg)]],
  ["logos", [folder("logos-color", "färgade"), folder("logos-white", "Icke-färgade (vita)")]],
  [
    "logos-color",
    [folder("logos-color-png", "Pixelfiler (PNG)"), folder("logos-color-svg", "Vektorfiler (SVG)")],
  ],
  ["logos-color-png", [file("björnen_logo_color.png", png)]],
  ["logos-color-svg", [file("björnen_logo_color.svg", svg)]],
  [
    "logos-white",
    [folder("logos-white-png", "Pixelfiler (PNG)"), folder("logos-white-svg", "Vektorfiler (SVG)")],
  ],
  ["logos-white-png", [file("björnen_logo_white.png", png)]],
  ["logos-white-svg", [file("björnen_logo_white.svg", svg), file("ugglan_logo_white.svg", svg)]],
  ["fonts", [folder("lieberath", "lieberath grot")]],
  ["lieberath", [file("LieberathGrotesque-Bold.otf", "font/otf")]],
  ["templates", [file("Presentationsmall.potx", "application/vnd.ms-powerpoint")]],
])

/**
 * The folder a listing asks about, read out of its query.
 * @param url The listing's address.
 * @returns The parent folder's id, or undefined when the query names none.
 */
function askedFor(url: string): string | undefined {
  const query = new URL(url).searchParams.get("q") ?? ""
  return /'([^']+)' in parents/u.exec(query)?.[1]
}

/**
 * Answers the Drive API from the fixture, or refuses every listing while `isDown` says
 * Drive is down.
 * @param page The page whose requests to answer.
 * @param isDown Whether Drive refuses at the moment of the request.
 */
async function serveDrive(page: Page, isDown: () => boolean = () => false): Promise<void> {
  await page.unroute("https://www.googleapis.com/drive/v3/files*")
  await page.route("https://www.googleapis.com/drive/v3/files*", async (route: Route) => {
    if (isDown()) {
      await route.fulfill({ body: "{}", contentType: "application/json", status: 503 })
      return
    }
    const parent = askedFor(route.request().url())
    const files = parent === undefined ? [] : (drive.get(parent) ?? [])
    await route.fulfill({ body: JSON.stringify({ files }), contentType: "application/json" })
  })
}

test.beforeEach(async ({ page }) => {
  await serveDrive(page)
  // Pictures and downloads go to Google too, and no walk is about the pictures.
  for (const host of ["https://drive.google.com/**", "https://lh3.googleusercontent.com/**"]) {
    await page.route(host, async (route: Route) => {
      await route.abort()
    })
  }
  // The units reveal gates the card that says which animal a leader's unit wears.
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

test("the section lists the material's folders and the files beside them", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: "Material", exact: true }).first().click()

  await expect(page.getByRole("heading", { level: 1, name: "Material" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Allt material" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Avdelningssymboler/u })).toBeVisible()
  await expect(page.getByRole("link", { name: /Typsnitt att använda/u })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Lösa filer" })).toBeVisible()
})

test("a leader is offered their own unit's symbols first", async ({ page }) => {
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  // Lars leads unit 1, which the units' identities name Björnen.
  await expect(page.getByRole("heading", { name: "Din avdelnings symboler" })).toBeVisible()

  // Each symbol is offered in every format it exists in, straight from Drive.
  const vector = page.getByRole("link", { name: "Ladda ner björnen_logo_color.svg som SVG" })
  await expect(vector).toHaveAttribute("href", /drive\.google\.com\/uc\?export=download/u)
  await expect(
    page.getByRole("link", { name: "Ladda ner björnen_logo_white.png som PNG" }),
  ).toBeVisible()
})

test("the management sees the material without a unit's card", async ({ page }) => {
  await page.goto("/material")
  await signInAs(page, "Anna Almgren")

  await expect(page.getByRole("heading", { name: "Allt material" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Din avdelnings symboler" })).toBeHidden()
})

test("someone outside the contingent cannot reach the material", async ({ page }) => {
  await page.goto("/")
  await signInAs(page, "Olle Ohlsson")

  // Signed in and settled first, so the missing link is an answer rather than a page
  // that has not drawn yet.
  await expect(page.getByRole("link", { name: "Profil för Olle Ohlsson" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Material", exact: true })).toHaveCount(0)
})

test("the folders can be browsed down to a file to preview and download", async ({ page }) => {
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: /Avdelningssymboler/u }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Avdelningssymboler" })).toBeVisible()

  await page.getByRole("link", { name: /avdelningar - profilbilder/u }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "avdelningar - profilbilder" }),
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Filer" })).toBeVisible()

  // The picture opens a larger preview in place, with the same download under it.
  const picture = page.getByRole("button", { name: "abborren_SoMe", exact: true })
  await picture.click()
  const preview = page.getByRole("dialog", { name: "abborren_SoMe" })
  await expect(preview).toBeVisible()
  await expect(preview.getByRole("link", { name: "Ladda ner abborren_SoMe.png" })).toHaveAttribute(
    "href",
    /drive\.google\.com\/uc\?export=download/u,
  )
  // A picture is the whole of an image, so there is no detour to Drive's viewer.
  await expect(preview.getByRole("link", { name: "Öppna i Google Drive" })).toHaveCount(0)

  await page.keyboard.press("Escape")
  await expect(preview).toBeHidden()
  await expect(picture).toBeFocused()
})

test("a document's preview offers to read it in full on Drive", async ({ page }) => {
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("button", { name: "WSJ27SE_form version 8", exact: true }).click()
  const preview = page.getByRole("dialog", { name: "WSJ27SE_form version 8" })
  await expect(preview.getByRole("link", { name: "Öppna i Google Drive" })).toHaveAttribute(
    "href",
    /drive\.google\.com\/file\/d\/.+\/view/u,
  )

  await preview.getByRole("button", { name: "Stäng" }).click()
  await expect(preview).toBeHidden()
})

test("the search reaches a file in any folder and says where it is", async ({ page }) => {
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("searchbox", { name: "Sök i materialet" }).fill("ugglan svg")

  await expect(page.getByRole("heading", { name: "Sökresultat" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Ladda ner ugglan_logo_white.svg" })).toBeVisible()
  await expect(page.getByText("Icke-färgade (vita) › Vektorfiler (SVG)").first()).toBeVisible()
  // The unit's own card steps aside while a search is showing.
  await expect(page.getByRole("heading", { name: "Din avdelnings symboler" })).toBeHidden()

  await page.getByRole("searchbox", { name: "Sök i materialet" }).fill("finns inte")
  await expect(page.getByRole("status")).toHaveText("Inget material matchar sökningen.")
})

test("material that cannot be read says so and offers to try again", async ({ page }) => {
  let isDown = true
  await serveDrive(page, () => isDown)
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("status")).toHaveText("Materialet kunde inte hämtas.")

  isDown = false
  await page.getByRole("button", { name: "Försök igen" }).click()

  await expect(page.getByRole("heading", { name: "Allt material" })).toBeVisible()
})

test("an address to a folder that is gone says so", async ({ page }) => {
  await page.goto("/material/gone")
  await signInAs(page, "Lars Lindberg")

  await expect(page.getByRole("heading", { level: 1, name: "Mappen finns inte" })).toBeVisible()
  await page.getByRole("link", { name: "Till materialet" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Material" })).toBeVisible()
})
