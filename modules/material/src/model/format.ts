import type { MaterialFile } from "./MaterialNode"

/**
 * How Swedish writes a size – a decimal comma, and at most one decimal.
 */
const decimal = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 })

/**
 * The units a size is said in, each a thousand of the one before, as Drive reports sizes
 * and as a phone's file browser shows them.
 */
const sizeUnits = ["B", "kB", "MB", "GB"] as const

/**
 * What a reader calls each media type. Keyed by media type rather than extension,
 * because the extension is whatever somebody typed and the media type is what Drive
 * resolved. A Google-native type is called what its download is, a PDF.
 */
const typeNames: ReadonlyMap<string, string> = new Map([
  ["application/msword", "Word"],
  ["application/pdf", "PDF"],
  ["application/vnd.google-apps.document", "PDF"],
  ["application/vnd.google-apps.presentation", "PDF"],
  ["application/vnd.google-apps.spreadsheet", "PDF"],
  ["application/vnd.ms-powerpoint", "PowerPoint"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "PowerPoint"],
  ["application/vnd.openxmlformats-officedocument.presentationml.template", "PowerPoint"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.template", "Word"],
  ["application/x-font-otf", "OTF"],
  ["font/otf", "OTF"],
  ["image/jpeg", "JPG"],
  ["image/png", "PNG"],
  ["image/svg+xml", "SVG"],
])

/**
 * What to call a file's type – "SVG", "PDF", "Word". Falls back to the extension, and
 * then to nothing, so an unknown type stays quiet rather than showing a media type.
 * @param file The file.
 * @returns The short name of its type, or an empty string.
 */
export function typeName(file: MaterialFile): string {
  const known = typeNames.get(file.mimeType)
  if (known !== undefined) {
    return known
  }
  const dot = file.name.lastIndexOf(".")
  return dot <= 0 ? "" : file.name.slice(dot + 1).toUpperCase()
}

/**
 * A size in the largest unit that leaves it at one or more – "96 kB", "2,3 MB".
 * @param bytes The size in bytes.
 * @returns The size as a reader reads it, or an empty string where none was reported.
 */
export function fileSize(bytes: number): string {
  if (bytes <= 0) {
    return ""
  }
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < sizeUnits.length - 1) {
    value /= 1000
    unit += 1
  }
  return `${decimal.format(value)} ${sizeUnits.at(unit) ?? "B"}`
}

/**
 * The quiet line under a file's name: its type and its size, whichever are known.
 * @param file The file.
 * @returns The line, "PDF · 2,3 MB", or an empty string when neither is known.
 */
export function fileFacts(file: MaterialFile): string {
  return [typeName(file), fileSize(file.size)].filter(Boolean).join(" · ")
}

/**
 * How many files a folder holds, the count and the word agreeing.
 * @param count The number of files.
 * @returns "1 fil" or "24 filer".
 */
export function fileCount(count: number): string {
  return count === 1 ? "1 fil" : `${String(count)} filer`
}

/**
 * The name without its extension, for where the type is already said beside it.
 * @param name The file's name.
 * @returns The name up to its last dot, or the whole name when it has none.
 */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot <= 0 ? name : name.slice(0, dot)
}
