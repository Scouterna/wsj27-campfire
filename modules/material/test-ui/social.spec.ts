import { crc32, deflateSync } from "node:zlib"

import { expect, test, type Locator, type Page } from "@playwright/test"

// The image maker: a photo, one of the frames or none, and text written on the picture
// itself, on one unmoving page, and the finished image downloaded.
//
// A real photo goes in and a real file comes out, because the whole feature is that
// round trip – a walk that stopped at the previews would not have proved that pressing
// one gives anybody a file.

/**
 * A chunk of a PNG: its length, its type, its bytes, and the checksum over the last two.
 * @param type The four-character chunk type.
 * @param data The chunk's bytes.
 * @returns The chunk.
 */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typed = Buffer.concat([Buffer.from(type, "latin1"), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, checksum])
}

/**
 * A photo to upload: 160 by 90, so it is wide and the crop into a standing frame is the
 * interesting case rather than the trivial one.
 *
 * Built here rather than committed as a fixture. It is a gradient, and a binary in the
 * repository would be a gradient nobody can diff – and it has to be a real image, because
 * the screen decodes it the way a browser decodes a photo off a phone.
 * @returns The bytes of a PNG.
 */
function photoBytes(): Buffer {
  const width = 160
  const height = 90

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // eight bits a channel
  header[9] = 2 // three channels, no alpha

  // One filter byte per row, then the row's pixels.
  const stride = 1 + width * 3
  const pixels = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = y * stride + 1 + x * 3
      pixels.writeUInt8(x, at)
      pixels.writeUInt8(y, at + 1)
      pixels.writeUInt8(120, at + 2)
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

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
 * Opens the image maker as somebody, with a photo already in the primary frame.
 * @param page The page to walk.
 * @param persona The persona to sign in as.
 */
async function openWithPhoto(page: Page, persona: string): Promise<void> {
  await page.goto("/material/skapa-bild")
  await signInAs(page, persona)
  await choosePhoto(page)
  await pickFrame(page, "Primärram")
  await expect(page.getByRole("img", { name: /^Primärram med din bild/u })).toBeVisible()
}

/**
 * The field laid over the picture where a frame with one text slot draws it.
 * @param page The page showing the image maker.
 * @returns The field.
 */
function textField(page: Page): Locator {
  return page.getByRole("textbox", { exact: true, name: "Text" })
}

/**
 * Adds a text to the primary frame and writes in it.
 * @param page The page showing the image maker, with the primary frame chosen.
 * @param text What to write.
 * @returns The new text's field.
 */
async function addText(page: Page, text: string): Promise<Locator> {
  const count = await page.getByRole("textbox", { name: /^Text \d/u }).count()
  await page.getByRole("button", { name: "Lägg till text" }).click()
  const field = page.getByRole("textbox", { name: `Text ${String(count + 1)}` })
  await expect(field).toBeFocused()
  await page.keyboard.type(text)
  return field
}

/**
 * Where the first text added to the primary frame is, as its field over the picture is
 * placed: its turn in degrees, and its size as a share of the picture's height.
 * @param page The page showing the image maker.
 * @returns The turn and the size.
 */
async function placed(page: Page): Promise<{ angle: number; size: number }> {
  return page.getByRole("textbox", { name: "Text 1" }).evaluate((field) => ({
    angle: Number((field as HTMLElement).style.getPropertyValue("--angle")),
    size: Number((field as HTMLElement).style.getPropertyValue("--size")),
  }))
}

/**
 * Picks a frame, so the picture and the download are that frame's.
 * @param page The page showing the image maker.
 * @param label The frame's name as the reader sees it.
 */
async function pickFrame(page: Page, label: string): Promise<void> {
  await page.getByRole("group", { name: "Ramar" }).getByRole("button", { name: label }).click()
}

/**
 * The editor while a frame is chosen – its picture, its fields, and its download.
 * @param page The page showing the image maker.
 * @param id The chosen frame's own name.
 * @returns The editor.
 */
function frame(page: Page, id: string): Locator {
  return page.locator(`[data-frame="${id}"]`)
}

/**
 * Puts a photo into the screen's file input.
 * @param page The page showing the image maker.
 */
async function choosePhoto(page: Page): Promise<void> {
  await page
    .locator(".social-input")
    .setInputFiles({ buffer: photoBytes(), mimeType: "image/png", name: "foto.png" })
}

test("is the material page's primary action", async ({ page }) => {
  // The material itself comes from Google Drive, which this walk has no reason to reach.
  await page.route("https://www.googleapis.com/**", async (route) => route.abort())
  await page.goto("/material")
  await signInAs(page, "Lars Lindberg")

  await page.getByRole("link", { name: "Skapa bild" }).first().click()

  await expect(page).toHaveURL(/\/material\/skapa-bild$/u)
  await expect(page.getByRole("heading", { name: "Skapa bild" })).toBeVisible()
})

test("lays the whole page out from the start and fills it in as things are chosen", async ({
  page,
}) => {
  await page.goto("/material/skapa-bild")
  await signInAs(page, "Lars Lindberg")

  // The frames are shown before there is a photo, but a frame is chosen for a photo, its
  // text is written on it, and there is nothing to download until there is one.
  // No frame, and every frame the graphic profile offers.
  const frames = page.getByRole("group", { name: "Ramar" }).getByRole("button")
  await expect(frames).toHaveCount(4)
  await expect(frames.first()).toBeDisabled()
  await expect(page.getByRole("textbox")).toHaveCount(0)
  const download = page.getByRole("button", { exact: true, name: "Ladda ner" })
  await expect(download).toHaveCount(0)

  // A photo is an image on its own, with no frame at all.
  await choosePhoto(page)
  await expect(page.getByRole("img", { name: "Din bild, utan ram" })).toBeVisible()
  await expect(download).toBeVisible()

  // A field on the picture for each strip of the ribbon.
  await pickFrame(page, "Strykningar")
  await expect(page.getByRole("img", { name: "Strykningar med din bild" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: /^Rad /u })).toHaveCount(4)
})

test("adds texts to the primary frame one at a time, and drops one left empty", async ({
  page,
}) => {
  await openWithPhoto(page, "Lars Lindberg")
  // The frame starts with no text at all.
  await expect(page.getByRole("textbox")).toHaveCount(0)

  await addText(page, "Hej från")
  await addText(page, "Björnen!")
  await expect(page.getByRole("textbox", { name: /^Text \d/u })).toHaveCount(2)

  // A text added and left without a word is not kept.
  await page.getByRole("button", { name: "Lägg till text" }).click()
  await page.getByRole("button", { name: "Byt bild" }).focus()
  await expect(page.getByRole("textbox", { name: /^Text \d/u })).toHaveCount(2)

  // The selected text carries the button that removes it.
  await page.getByRole("textbox", { name: "Text 2" }).focus()
  await page.getByRole("button", { name: "Ta bort texten" }).click()
  await expect(page.getByRole("textbox", { name: /^Text \d/u })).toHaveCount(1)
})

test("makes an image with no frame, sharing its text with the primary frame", async ({ page }) => {
  await page.goto("/material/skapa-bild")
  await signInAs(page, "Lars Lindberg")
  await choosePhoto(page)
  await addText(page, "Hej!")

  // The primary frame places text the way the picture without one does, so it shares it.
  const none = page.getByRole("group", { name: "Ramar" }).getByRole("button", { name: "Utan ram" })
  await expect(none).toHaveAttribute("aria-pressed", "true")
  await pickFrame(page, "Primärram")
  await expect(none).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByRole("img", { name: /^Primärram med din bild/u })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveValue("Hej!")
  await pickFrame(page, "Utan ram")

  await expect(page.getByRole("img", { name: /^Din bild, utan ram/u })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveValue("Hej!")
})

test("adds text to a frame with slots of its own, keeping the slots", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  await pickFrame(page, "Strykningar")

  await addText(page, "Hej!")

  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveValue("Hej!")
  await expect(page.getByRole("textbox", { name: /^Rad /u })).toHaveCount(4)

  // Its design differs from the others', so its added texts are its own.
  await pickFrame(page, "Primärram")
  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveCount(0)
  await pickFrame(page, "Strykningar")
  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveValue("Hej!")
})

test("opens a new line in an added text as soon as return is pressed", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  const field = await addText(page, "Hej")
  const height = async (): Promise<number> =>
    field.evaluate((element) => Number((element as HTMLElement).style.getPropertyValue("--height")))
  const oneLine = await height()

  await page.keyboard.press("Enter")

  // The field grows to hold the line the caret is now on, before anything is typed on it.
  await expect.poll(height).toBeGreaterThan(oneLine * 1.5)
})

test("downloads a photo with no frame at all", async ({ page }) => {
  await page.goto("/material/skapa-bild")
  await signInAs(page, "Lars Lindberg")
  await choosePhoto(page)
  await addText(page, "Hej!")

  const download = page.waitForEvent("download")
  await page.getByRole("button", { exact: true, name: "Ladda ner" }).click()

  const saved = await download
  expect(saved.suggestedFilename()).toBe("wsj27-bild.png")
})

test("removes the selected text with Delete", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  const field = await addText(page, "Hej!")
  await field.blur()

  await page.getByRole("img", { name: /^Primärram med din bild/u }).focus()
  await page.keyboard.press("Delete")

  await expect(page.getByRole("textbox", { name: /^Text \d/u })).toHaveCount(0)
})

test("keeps what was written in a frame while another is tried", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  await addText(page, "Hej!")

  await pickFrame(page, "Trollsländan")
  await expect(textField(page)).toHaveValue("")
  await pickFrame(page, "Primärram")

  await expect(page.getByRole("textbox", { name: "Text 1" })).toHaveValue("Hej!")
})

test("puts the unit's own mark in the primary frame", async ({ page }) => {
  // Lars leads unit 1, so its glyph is what the corner of the primary frame carries.
  const glyph = page.waitForRequest("**/units/1.svg")
  await openWithPhoto(page, "Lars Lindberg")

  await glyph
})

test("wears the leader's own unit color, with nothing to choose", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")

  // Lars leads unit 1, which wears yellow – so the frames are yellow and he is offered
  // no color to pick. The color is a property of the unit, not a decision.
  await expect(page.getByRole("group", { exact: true, name: "Färg" })).toBeHidden()
  await expect(frame(page, "primarram")).toHaveAttribute("data-theme", "yellow")
})

test("gives the contingent management the contingent's own mark by default", async ({ page }) => {
  // The management belongs to no unit, so the images it makes are the contingent's until
  // it says otherwise – the contingent's wordmark, in the contingent's red.
  const mark = page.waitForRequest(/logo-red/u)
  await openWithPhoto(page, "Karin Kron")

  await expect(page.getByLabel("Vem är bilden för?")).toHaveValue("contingent")
  await expect(frame(page, "primarram")).toHaveAttribute("data-theme", "red")
  await mark
})

test("lets the contingent's own images be made in any of the five colors", async ({ page }) => {
  await openWithPhoto(page, "Karin Kron")

  // A unit wears one color and its material is in that one; the contingent is all five,
  // so which one an image wants is the sender's decision. The wordmark follows it.
  const mark = page.waitForRequest(/logo-green/u)
  await page
    .getByRole("group", { exact: true, name: "Färg" })
    .getByRole("button", { name: "Grön" })
    .click()

  await expect(frame(page, "primarram")).toHaveAttribute("data-theme", "green")
  await mark
})

test("lets the contingent management make an image for any unit", async ({ page }) => {
  await openWithPhoto(page, "Karin Kron")

  // One choice, not two: a unit's color and a unit's mark are one fact about it, so
  // naming the unit sets both. Unit 11 is Kräftan, and Kräftan wears yellow.
  const glyph = page.waitForRequest("**/units/11.svg")
  await page.getByLabel("Vem är bilden för?").selectOption("11")

  await expect(frame(page, "primarram")).toHaveAttribute("data-theme", "yellow")
  await expect(page.getByRole("group", { exact: true, name: "Färg" })).toBeHidden()
  await glyph
})

test("downloads the frame that was pressed, with its text, at Instagram's size", async ({
  page,
}) => {
  await openWithPhoto(page, "Lars Lindberg")
  await pickFrame(page, "Trollsländan")
  const card = frame(page, "trollslandan")
  const before = await card.getByRole("img").screenshot()

  await textField(page).fill("Rolf")
  // The text is drawn into the picture, so the picture changes as it is typed.
  await expect
    .poll(async () => {
      const after = await card.getByRole("img").screenshot()
      return after.equals(before)
    })
    .toBe(false)

  const download = page.waitForEvent("download")
  await page.getByRole("button", { exact: true, name: "Ladda ner" }).click()

  // The file is the point of the whole screen, and its name says which frame made it.
  const saved = await download
  expect(saved.suggestedFilename()).toBe("wsj27-trollslandan.png")

  // A PNG's header names its size: width, then height, from the sixteenth byte.
  const stream = await saved.createReadStream()
  const chunks: Buffer[] = []
  for await (const piece of stream) {
    chunks.push(piece as Buffer)
  }
  const bytes = Buffer.concat(chunks)
  expect(bytes.readUInt32BE(16)).toBe(1080)
  expect(bytes.readUInt32BE(20)).toBe(1350)
})

test("lets an added text be dragged, sized, and turned", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  const field = await addText(page, "Hej från Björnen!")
  // Done writing – while the field has focus, a press on the text is the field's.
  await field.blur()
  const fitted = await placed(page)
  expect(fitted.angle).toBe(0)

  // A drag on the text only moves it – its size and its turn stay where they were.
  const picture = page.getByRole("img", { name: /^Primärram med din bild/u })
  const before = await picture.screenshot()
  const box = await field.boundingBox()
  if (box === null) {
    throw new Error("The text has no box")
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 3, box.y - box.height, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(async () => {
      const after = await picture.screenshot()
      return after.equals(before)
    })
    .toBe(false)
  expect(await placed(page)).toEqual(fitted)

  // The tools over the picture size it a step and turn it a quarter.
  await page.getByRole("button", { name: "Vrid åt höger" }).click()
  await page.getByRole("button", { name: "Större text" }).click()
  const tooled = await placed(page)
  expect(tooled.angle).toBe(90)
  expect(tooled.size).toBeGreaterThan(fitted.size)
})
test("sets an added text in white, black, or the theme's color", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  await addText(page, "Hej!")
  const picture = page.getByRole("img", { name: /^Primärram med din bild/u })
  const before = await picture.screenshot()

  // One button holds the color, and fans the three out to pick from.
  const tool = page.getByRole("button", { name: "Textfärg" })
  await tool.click()
  const fan = page.getByRole("group", { name: "Textfärg" })
  await expect(fan.getByRole("button", { name: "Vit text" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  // Lars's unit wears yellow, so that is the third color offered.
  await fan.getByRole("button", { name: "Gul text" }).click()

  // The fan folds on a pick, and the text is set in the color picked.
  await expect(tool).toHaveAttribute("aria-expanded", "false")
  await expect
    .poll(async () => {
      const after = await picture.screenshot()
      return after.equals(before)
    })
    .toBe(false)
})

test("starts a new text in the color last picked", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  await addText(page, "Hej")
  await page.getByRole("button", { name: "Textfärg" }).click()
  await page
    .getByRole("group", { name: "Textfärg" })
    .getByRole("button", { name: "Svart text" })
    .click()

  await addText(page, "då")
  await page.getByRole("button", { name: "Textfärg" }).click()

  await expect(
    page.getByRole("group", { name: "Textfärg" }).getByRole("button", { name: "Svart text" }),
  ).toHaveAttribute("aria-pressed", "true")
})

test("sizes and turns an added text from the keyboard", async ({ page }) => {
  await openWithPhoto(page, "Lars Lindberg")
  await addText(page, "Hej!")
  const fitted = await placed(page)

  await page.getByRole("img", { name: /^Primärram med din bild/u }).focus()
  await page.keyboard.press("]")
  await page.keyboard.press("+")

  const keyed = await placed(page)
  expect(keyed.angle).toBe(90)
  expect(keyed.size).toBeGreaterThan(fitted.size)
})
