import { contingentMark, displayFontFile, type Theme } from "@scouterna/wsj27-campfire-ui"

import type { HandbookDocument } from "../../model/documents"
import { imagesOf } from "../../model/RichText"
import type { PdfColors } from "./pdf-look"
import { redrawn } from "./pictures"

/**
 * Makes a document as a PDF on the device and hands it to the browser to save. Nothing
 * is asked of a server: the document is set from the handbook the application already
 * holds, so it works with no connection.
 *
 * What sets the document is fetched only now, because it is large and most readers never
 * ask for a PDF.
 * @param handbook The document to make.
 * @param theme The unit color to set it in.
 * @returns Nothing, once the browser has been handed the file.
 * @throws {Error} When the document could not be made – what sets it could not be fetched, or
 * the handbook holds something it cannot set.
 */
export async function downloadDocument(handbook: HandbookDocument, theme: Theme): Promise<void> {
  const [{ pdf }, { renderDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./render-document"),
  ])
  const sources = new Set(
    handbook.chapters.flatMap((entry) => entry.pages.flatMap((page) => imagesOf(page.content))),
  )
  const [logo, ...drawn] = await Promise.all([
    redrawn(contingentMark(theme), "image/png"),
    ...[...sources].map(async (source) => [source, await redrawn(source, "image/jpeg")] as const),
  ])
  const pictures = new Map(
    drawn.flatMap(([source, picture]) => (picture === undefined ? [] : [[source, picture]])),
  )

  const file = await renderDocument(
    { colors: colorsOf(theme), document: handbook, fontFile: displayFontFile, logo, pictures },
    async (laidOut) => pdf(laidOut).toBlob(),
  )
  save(file, `${handbook.fileName}.pdf`)
}

/**
 * A theme's colors as the stylesheet sets them, whatever theme the page itself wears.
 * @param theme The theme.
 * @returns The colors.
 */
function colorsOf(theme: Theme): PdfColors {
  return {
    bright: painted("--color-theme-bright", theme),
    ink: painted("--color-theme-ink", theme),
    onBright: painted("--color-theme-on-bright", theme),
  }
}

/**
 * A color token as the plain color it paints. A token may be written as a mix of other
 * tokens, which a document cannot read, so the color is painted onto a canvas and read
 * back as what it came out as.
 * @param token The token's name.
 * @param theme The theme to read the token in.
 * @returns The color, as a hexadecimal triplet.
 */
function painted(token: string, theme: Theme): string {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (context === null) {
    return "#000000"
  }
  // An element wears the token, in the theme asked for, because a canvas resolves no
  // tokens of its own.
  const probe = document.createElement("span")
  probe.dataset["theme"] = theme
  probe.style.color = `var(${token})`
  document.body.append(probe)
  context.fillStyle = getComputedStyle(probe).color
  probe.remove()
  context.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`
}

/**
 * Hands a file to the browser to save, under a name.
 * @param file The file.
 * @param name What to call it.
 */
function save(file: Blob, name: string): void {
  const address = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = address
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // Released once the browser has had its turn to start the download.
  setTimeout(() => {
    URL.revokeObjectURL(address)
  }, 60_000)
}
