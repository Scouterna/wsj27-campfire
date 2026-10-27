/**
 * The longest side the cases service stores a picture at, so a larger one is shrunk on
 * the phone rather than sent whole and shrunk there.
 */
const longestSide = 2048

/**
 * The JPEG quality the cases service stores a picture at.
 */
const quality = 0.85

/**
 * A picture's size once it fits a square box, keeping its shape and never growing.
 * @param width The picture's width in pixels.
 * @param height Its height in pixels.
 * @param box The box's side in pixels.
 * @returns The width and height, each at least a pixel.
 */
export function fitWithin(width: number, height: number, box: number): readonly [number, number] {
  const scale = Math.min(1, box / Math.max(width, height, 1))
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))]
}

/**
 * A file name for a picture once it is a JPEG – its own name with the extension a JPEG
 * carries, or a plain one where it had none to keep.
 * @param name The name the picture was chosen under.
 * @returns The name, ending in `.jpg`.
 */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./]*$/u, "").trim()
  return `${base === "" ? "bild" : base}.jpg`
}

/**
 * A picture as it is sent: upright, at most as large as the service stores it, and a
 * JPEG, which carries none of the original's EXIF – so a photo's location never leaves
 * the phone, and a camera's ten megabytes cross a slow network as a few hundred
 * kilobytes. A transparent picture is laid on white, as a JPEG has no transparency.
 *
 * A picture the browser cannot read is sent as it was chosen, for the service to judge.
 * @param file The picture as it was chosen.
 * @returns The picture to send.
 */
export async function shrinkPicture(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    // The browser applies the EXIF orientation as it decodes, so the pixels are upright.
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  try {
    const [width, height] = fitWithin(bitmap.width, bitmap.height, longestSide)
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d")
    if (context === null) {
      return file
    }
    context.fillStyle = "#fff"
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ quality, type: "image/jpeg" })
    return new File([blob], jpegName(file.name), { type: "image/jpeg" })
  } finally {
    bitmap.close()
  }
}
