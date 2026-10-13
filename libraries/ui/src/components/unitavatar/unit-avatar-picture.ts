import { useEffect, useState } from "react"

import type { Theme } from "../../foundations/theme/Theme"
import { useTheme } from "../../foundations/theme/ThemeProvider"
import { useUnitIdentities } from "../../foundations/units/UnitIdentities"

/**
 * The picture's side in pixels, enough for a native bar's avatar on the densest screens.
 */
const pictureSize = 120

/**
 * A unit's mark drawn as a PNG, for a surface that cannot render the mark itself – a
 * native shell's bar. It wears the surrounding theme and the same proportions as
 * `UnitAvatar`, whose stylesheet is the authority on how the mark looks, but never a
 * leader's star, which a bar's avatar has no room for.
 *
 * @param unitNumber The avatar's number – a unit's own, or the IST's or the contingent
 *   management's slot beyond the units – or undefined for no mark.
 * @returns The picture as a `data:` URL, or undefined for no mark, while it draws, for a
 *   unit with no known glyph, and when drawing fails.
 */
export function useUnitAvatarPicture(unitNumber: number | undefined): string | undefined {
  const theme = useTheme()
  const identities = useUnitIdentities()
  const glyph = unitNumber === undefined ? undefined : identities.glyphSrc(unitNumber)
  const key = glyph === undefined ? undefined : `${glyph} ${theme}`
  const [drawn, setDrawn] = useState<{ readonly key: string; readonly url: string }>()

  useEffect(() => {
    if (key === undefined || glyph === undefined) {
      return
    }
    // The mark can change while a glyph loads, and a late picture of the previous one
    // must not land after the current one.
    let isCurrent = true
    const draw = async (): Promise<void> => {
      const url = await drawPicture(glyph, theme)
      if (isCurrent && url !== undefined) {
        setDrawn({ key, url })
      }
    }
    void draw()
    return () => {
      isCurrent = false
    }
  }, [glyph, key, theme])

  return drawn !== undefined && drawn.key === key ? drawn.url : undefined
}

/**
 * Draws the mark – the bright ring, the ink disc, and the white glyph – as the
 * stylesheet lays it out.
 *
 * @param glyphSource where the unit's glyph is served
 * @param theme the theme whose bright and ink the mark wears
 * @returns The picture as a `data:` URL, or undefined when the glyph or a canvas fails.
 */
async function drawPicture(glyphSource: string, theme: Theme): Promise<string | undefined> {
  try {
    const glyph = await loadGlyph(glyphSource)
    const canvas = document.createElement("canvas")
    canvas.width = pictureSize
    canvas.height = pictureSize
    const context = canvas.getContext("2d")
    if (glyph === undefined || context === null) {
      return undefined
    }
    const { bright, ink } = themeColors(theme)
    const center = pictureSize / 2

    context.fillStyle = bright
    context.beginPath()
    context.arc(center, center, center, 0, Math.PI * 2)
    context.fill()

    const disc = pictureSize * 0.88
    context.fillStyle = ink
    context.beginPath()
    context.arc(center, center, disc / 2, 0, Math.PI * 2)
    context.fill()

    // Contained in the box the glyph's max-width and max-height leave inside the disc.
    const scale = Math.min((disc * 0.68) / glyph.width, (disc * 0.62) / glyph.height)
    const width = glyph.width * scale
    const height = glyph.height * scale
    context.drawImage(glyph.image, center - width / 2, center - height / 2, width, height)
    return canvas.toDataURL("image/png")
  } catch {
    return undefined
  }
}

/**
 * Loads a glyph as an image a canvas can draw. The glyphs carry a `viewBox` and no size,
 * which leaves the image a size each engine invents for itself, so the size is written
 * in from the `viewBox` first.
 *
 * @param source where the glyph is served
 * @returns The image and its size, or undefined for a glyph without a usable `viewBox`.
 */
async function loadGlyph(
  source: string,
): Promise<
  { readonly height: number; readonly image: HTMLImageElement; readonly width: number } | undefined
> {
  const response = await fetch(source)
  if (!response.ok) {
    return undefined
  }
  const svg = new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  ).documentElement
  const box = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/u).map(Number)
  const width = box[2] ?? 0
  const height = box[3] ?? 0
  if (!(width > 0 && height > 0)) {
    return undefined
  }
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))

  const image = new Image()
  image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  await image.decode()
  return { height, image, width }
}

/**
 * The bright and the ink a theme wears, read from the stylesheet through a probe rather
 * than repeated here. The probe carries its own theme, because the document's root takes
 * a changed theme only in an effect that may run after the caller's.
 *
 * @param theme the theme to read
 * @returns The theme's colors, as the stylesheet resolves them.
 */
function themeColors(theme: Theme): { readonly bright: string; readonly ink: string } {
  const probe = document.createElement("span")
  probe.dataset["theme"] = theme
  probe.hidden = true
  document.body.append(probe)
  const style = getComputedStyle(probe)
  const colors = {
    bright: style.getPropertyValue("--color-theme-bright").trim(),
    ink: style.getPropertyValue("--color-theme-ink").trim(),
  }
  probe.remove()
  return colors
}
