/**
 * The form a picture is kept in inside a document: lossless where its edges have to stay
 * sharp or it shows through, as a mark does, and compressed for everything else.
 */
export type PictureForm = "image/jpeg" | "image/png"

// The most pixels a picture's longer side keeps, which is sharp on paper at the widest a
// sheet draws it, and the least a drawing without a size of its own is drawn at.
const longest = 1800
const drawnAt = 900

/**
 * A picture redrawn in a form a document can hold. A document reads only PNGs and JPEGs,
 * while the handbook's pictures are whatever the CMS stores and the contingent's mark is
 * a drawing, so each is drawn onto a canvas and read back.
 * @param source The picture's address, or the picture itself as a `data:` address.
 * @param form The form to keep it in.
 * @returns The picture as a `data:` address, or undefined when it could not be read.
 */
export async function redrawn(source: string, form: PictureForm): Promise<string | undefined> {
  const picture = new Image()
  picture.decoding = "async"
  picture.src = source
  try {
    await picture.decode()
  } catch {
    return undefined
  }
  const natural = Math.max(picture.naturalWidth, picture.naturalHeight)
  if (natural === 0) {
    return undefined
  }
  // A photograph is only ever made smaller, a drawing is made as large as it is needed.
  const scale =
    form === "image/png" ? Math.max(1, drawnAt / natural) : Math.min(1, longest / natural)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(picture.naturalWidth * scale)
  canvas.height = Math.round(picture.naturalHeight * scale)
  const context = canvas.getContext("2d")
  if (context === null) {
    return undefined
  }
  if (form === "image/jpeg") {
    // The compressed form has no transparency, and paper is white.
    context.fillStyle = "#fff"
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(picture, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL(form, 0.9)
  } catch {
    // A picture from another origin that did not allow reading taints the canvas.
    return undefined
  }
}
