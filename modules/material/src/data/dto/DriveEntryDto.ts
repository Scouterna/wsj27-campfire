import type { MaterialNode } from "../../model/MaterialNode"

/**
 * One entry of a folder's listing, as the Drive API sends it.
 */
export interface DriveEntryDto {
  readonly id?: unknown
  readonly mimeType?: unknown
  readonly name?: unknown
  /**
   * A string of digits rather than a number, absent for a folder, and a placeholder for
   * a Google-native file, which has no bytes of its own.
   */
  readonly size?: unknown
}

/**
 * What Drive calls a folder.
 */
const folderMimeType = "application/vnd.google-apps.folder"

/**
 * The Google-native types the material can hold, each with the path its editor exports
 * it from. They have no bytes of their own, so Drive's download answers with an error
 * page and the file is offered as a PDF instead.
 */
const nativeExports: ReadonlyMap<string, string> = new Map([
  ["application/vnd.google-apps.document", "document"],
  ["application/vnd.google-apps.presentation", "presentation"],
  ["application/vnd.google-apps.spreadsheet", "spreadsheets"],
])

/**
 * Files a Mac writes beside the ones people uploaded, which nobody wants to see.
 */
const ignored = new Set([".DS_Store", "Icon\r"])

/**
 * How wide a thumbnail is asked for – twice a tile's width, so it stays sharp on a
 * phone's dense screen.
 */
const thumbnailWidth = 320

/**
 * How wide a preview's picture is asked for – twice the preview's own width.
 */
const pictureWidth = 1200

/**
 * One entry converted to a node, or undefined when it is unusable, something a Mac
 * wrote, or a Google-native type with nothing to offer as a file, such as a form or a
 * shortcut. A folder arrives with no children, because they are another request away.
 * @param payload One entry of the listing's `files`.
 * @returns The node, or undefined.
 */
export function toMaterialNode(payload: unknown): MaterialNode | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }
  const dto = payload as DriveEntryDto
  const id = text(dto.id)
  const mimeType = text(dto.mimeType)
  // Composed, because a Mac uploads "ö" as an "o" and a combining diaeresis, which
  // compares unequal to the same word typed anywhere else.
  const name = text(dto.name)?.normalize("NFC")

  if (id === undefined || mimeType === undefined || name === undefined || ignored.has(name)) {
    return undefined
  }
  if (mimeType === folderMimeType) {
    return { children: [], id, kind: "folder", name }
  }
  const native = nativeExports.get(mimeType)
  if (native === undefined && mimeType.startsWith("application/vnd.google-apps.")) {
    return undefined
  }

  const encoded = encodeURIComponent(id)
  // Drive draws a vector onto an opaque white square at any size it is asked for, which
  // shows as a white box in the tile and hides a white symbol entirely. Only its unsized
  // rendering keeps the transparency, and a vector is small enough to take whole.
  const isVector = mimeType === "image/svg+xml"
  const unsized = `https://lh3.googleusercontent.com/d/${encoded}`
  return {
    downloadUrl:
      native === undefined
        ? `https://drive.google.com/uc?export=download&id=${encoded}`
        : `https://docs.google.com/${native}/d/${encoded}/export?format=pdf`,
    id,
    kind: "file",
    mimeType,
    name,
    pictureUrl: isVector ? unsized : thumbnail(encoded, pictureWidth),
    // The size Drive reports for a native file is a placeholder, not what the PDF weighs.
    size: native === undefined ? size(dto.size) : 0,
    thumbnailUrl: isVector ? unsized : thumbnail(encoded, thumbnailWidth),
    viewerUrl: `https://drive.google.com/file/d/${encoded}/view`,
  }
}

/**
 * Where Drive renders a picture of a file at a width, keeping its proportions.
 * @param encoded The file's id, encoded for a query.
 * @param width The width in pixels.
 * @returns The address.
 */
function thumbnail(encoded: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${encoded}&sz=w${String(width)}`
}

/**
 * A size in bytes, or zero where there is none to read.
 * @param value The field as it arrived.
 * @returns The size.
 */
function size(value: unknown): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : 0
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * A non-empty string, or undefined.
 * @param value The field as it arrived.
 * @returns The string, or undefined when it is not a usable one.
 */
function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined
}
