import type { Theme } from "@scouterna/wsj27-campfire-ui"

import { coverRect } from "./cover"
import { exportSize, type Box, type Frame, type TextSlot } from "./Frame"
import { addedSlotOf } from "./frames"
import { initialPlacement, type PlacedText, type Placement, type TextColor } from "./placement"
import { fitSize, lineHeight, linesOf, textFace } from "./text"

/**
 * Everything one image is made of. A finished one has both a photo and a frame; before
 * the reader has chosen them, either may be missing and the picture shows what there is.
 */
export interface Scene {
  /**
   * The frame laid over the photo, or undefined for none.
   */
  readonly frame: Frame | undefined
  /**
   * The mark drawn where the frame leaves room for one, or undefined to leave it out.
   */
  readonly markUrl: string | undefined
  /**
   * The reader's photo, already decoded, or undefined before one is chosen.
   */
  readonly photo: ImageBitmap | undefined
  /**
   * The texts the reader has added, each drawn the way the slot they go in draws its text,
   * wherever the reader has put it – the frame's movable slot, or the free slot where
   * there is no frame.
   */
  readonly placed: readonly PlacedText[]
  /**
   * What the reader wrote in the slots that stay put, by slot id. A slot that is missing or
   * blank draws nothing.
   */
  readonly texts: Readonly<Record<string, string>>
  /**
   * The color the frame is drawn in.
   */
  readonly theme: Theme
}

/**
 * A scene with everything it draws loaded, so drawing it takes no time at all.
 */
export interface LoadedScene extends Scene {
  /**
   * The frame's artwork in the scene's color, or undefined when there is no frame.
   */
  readonly artwork: HTMLImageElement | undefined
  /**
   * The mark, or undefined when the scene draws none.
   */
  readonly mark: HTMLImageElement | undefined
}

/**
 * Loads what a scene draws: the artwork, the mark, and the face its text is set in.
 *
 * Loading is apart from drawing so that a caller drawing on every key pressed can drop a
 * load that a newer one overtook, rather than have the older one paint over it.
 * @param scene what to draw
 * @returns The scene, ready to draw.
 * @throws {Error} When the artwork or the mark cannot be loaded.
 */
export async function loadScene(scene: Scene): Promise<LoadedScene> {
  const [artwork, mark] = await Promise.all([
    scene.frame === undefined ? undefined : loadImage(scene.frame.sources[scene.theme]),
    scene.markUrl === undefined || scene.frame?.markBox === undefined
      ? undefined
      : loadImage(scene.markUrl),
    document.fonts.load(`${String(exportSize.height / 10)}px ${textFace}`),
  ])
  return { ...scene, artwork, mark }
}

/**
 * Draws an image onto a canvas, resizing it to the export size: the photo, the frame's
 * artwork and mark, the text in the frame's own slots, and the texts the reader added
 * over it all.
 *
 * The preview and the download are the same canvas, so what the reader sees is exactly
 * what they get – the text in particular is fitted by measuring it in the face it is
 * drawn in, which only a canvas does the same way twice. Nothing is uploaded: the photo
 * is mostly of other people's children, so it never leaves the device.
 * @param canvas the canvas to draw on
 * @param scene what to draw, loaded
 * @returns The size each text was drawn at, as a share of the picture's height, by slot id
 * for a slot that stays put and by text id for an added one – missing for one left empty.
 * Added text starts out fitted to its slot, and this is how a control learns what that
 * came to.
 * @throws {Error} When the browser gives no drawing context.
 */
export function drawScene(
  canvas: HTMLCanvasElement,
  scene: LoadedScene,
): Readonly<Record<string, number>> {
  const { height, width } = exportSize
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (context === null) {
    throw new Error("The browser gave no 2d drawing context")
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"

  // Setting the size cleared the canvas, so whatever is missing shows as the page
  // behind it.
  if (scene.photo !== undefined) {
    const rect = coverRect(scene.photo, exportSize)
    context.drawImage(scene.photo, rect.x, rect.y, rect.width, rect.height)
  }
  if (scene.artwork !== undefined) {
    context.drawImage(scene.artwork, 0, 0, width, height)
  }
  if (scene.mark !== undefined && scene.frame?.markBox !== undefined) {
    drawContained(context, scene.mark, scene.frame.markBox)
  }
  // The theme's color is read from the design system's tokens where the canvas sits, which
  // wears the picture's theme, so the colors are defined there and nowhere else.
  const themeColor = getComputedStyle(canvas).getPropertyValue("--color-theme-bright").trim()
  // Text in a slot that stays put sits on the frame's own color, so it is always white,
  // and the texts the reader added go over it, in the slot added text takes.
  const fixed = (scene.frame?.slots ?? []).filter((slot) => !slot.isMovable)
  const added = addedSlotOf(scene.frame)
  const set: readonly (readonly [string, SetText])[] = [
    ...fixed.map((slot) => {
      const text = scene.texts[slot.id] ?? ""
      return [slot.id, { color: "white", placement: undefined, slot, text, themeColor }] as const
    }),
    ...scene.placed.map((text) => {
      const { color, placement } = text
      return [text.id, { color, placement, slot: added, text: text.text, themeColor }] as const
    }),
  ]
  const sizes = new Map<string, number>()
  for (const [id, text] of set) {
    const size = drawText(context, text)
    if (size !== undefined) {
      sizes.set(id, size / exportSize.height)
    }
  }
  return Object.fromEntries(sizes)
}

/**
 * Draws a picture as large as fits in a box, centered, without distorting it.
 * @param context where to draw
 * @param image the picture
 * @param box where it goes
 */
function drawContained(context: CanvasRenderingContext2D, image: HTMLImageElement, box: Box): void {
  const room = { height: box.height * exportSize.height, width: box.width * exportSize.width }
  const scale = Math.min(room.width / image.width, room.height / image.height)
  const drawn = { height: image.height * scale, width: image.width * scale }
  context.drawImage(
    image,
    box.x * exportSize.width + (room.width - drawn.width) / 2,
    box.y * exportSize.height + (room.height - drawn.height) / 2,
    drawn.width,
    drawn.height,
  )
}

/**
 * One text to set: what it says, the slot that decides how, where the reader has put it
 * if it may move, and its color.
 */
interface SetText {
  readonly color: TextColor
  readonly placement: Placement | undefined
  readonly slot: TextSlot
  readonly text: string
  readonly themeColor: string
}

/**
 * The fill a text color stands for.
 * @param color the text's color
 * @param themeColor the theme's color, as a canvas fill, or empty where it could not be
 * read
 * @returns The fill.
 */
function fillOf(color: TextColor, themeColor: string): string {
  if (color === "theme" && themeColor !== "") {
    return themeColor
  }
  return color === "black" ? "#000000" : "#ffffff"
}

/**
 * Sets what the reader wrote in its slot, centered and turned along it – or wherever the
 * reader has put it, for a slot they may move – in its color.
 * @param context where to draw
 * @param set the text, its slot, where it is, and its color
 * @returns The size it was drawn at in pixels, or undefined when there was nothing to draw.
 */
function drawText(context: CanvasRenderingContext2D, set: SetText): number | undefined {
  const { placement, slot } = set
  const lines = linesOf(set.text, slot)
  if (lines.length === 0) {
    return undefined
  }
  const measure = (line: string, size: number): number => {
    context.font = `${String(size)}px ${textFace}`
    return context.measureText(line).width
  }
  const chosen = placement?.size
  const size =
    chosen === undefined ? fitSize(lines, slot, exportSize, measure) : chosen * exportSize.height
  const { angle, x, y } = placement ?? initialPlacement(slot)

  context.save()
  context.translate(x * exportSize.width, y * exportSize.height)
  context.rotate((angle * Math.PI) / 180)
  context.font = `${String(size)}px ${textFace}`
  context.fillStyle = fillOf(set.color, set.themeColor)
  context.textAlign = "center"
  context.textBaseline = "middle"
  // A block sits on the photo itself rather than on the frame's color, and a shadow is
  // what keeps it readable over a busy photo – a dark one under light text, and a light
  // one under black.
  if (slot.isMultiline) {
    context.shadowBlur = size / 4
    context.shadowColor = set.color === "black" ? "rgb(255 255 255 / 0.5)" : "rgb(0 0 0 / 0.5)"
  }
  for (const [index, line] of lines.entries()) {
    context.fillText(line, 0, (index - (lines.length - 1) / 2) * size * lineHeight)
  }
  context.restore()
  return size
}

/**
 * Pictures already asked for, by address, so a redraw on every key the reader presses
 * does not load the artwork again.
 */
const images = new Map<string, Promise<HTMLImageElement>>()

/**
 * A picture, decoded and ready to draw.
 * @param source the address it is served at
 * @returns The loaded picture.
 * @throws {Error} When it cannot be loaded, which for the artwork means it is missing
 * from the bundle. A failed load is forgotten, so the next draw tries again.
 */
async function loadImage(source: string): Promise<HTMLImageElement> {
  const known = images.get(source)
  if (known !== undefined) {
    return known
  }
  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => {
      resolve(image)
    })
    image.addEventListener("error", () => {
      images.delete(source)
      reject(new Error(`The picture at ${source} could not be loaded`))
    })
    image.src = source
  })
  images.set(source, loading)
  return loading
}

/**
 * A drawn canvas as PNG bytes. PNG rather than JPEG because the frames carry hard edges
 * and flat color, which JPEG rings around.
 * @param canvas the canvas to encode
 * @returns The bytes.
 * @throws {Error} When the browser refuses to encode it.
 */
export async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("The browser could not encode the image"))
        return
      }
      resolve(blob)
    }, "image/png")
  })
}

/**
 * What a finished image is called when it lands in somebody's downloads.
 * @param frame the frame it was made with, or undefined for none
 * @returns The file name.
 */
export function fileNameFor(frame: Frame | undefined): string {
  return `wsj27-${frame?.id ?? "bild"}.png`
}
