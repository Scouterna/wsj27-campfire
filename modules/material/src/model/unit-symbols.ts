import type { MaterialFile, MaterialNode } from "./MaterialNode"
import { isDrawnWhite } from "./tone"
import { everyFile, type LocatedFile } from "./tree"

/**
 * Which symbol a file is: the profile picture a unit uses on social media, the icon –
 * the animal alone – or the logotype, the animal with the unit's name.
 */
export type SymbolShape = "icon" | "logo" | "profile"

/**
 * Whether a symbol is drawn in color, or in white for a dark background.
 */
export type SymbolTone = "color" | "white"

/**
 * One unit's symbol in one shape and tone, in every format it exists in, so the reader
 * chooses a picture and then a format rather than reading filenames.
 */
export interface UnitSymbol {
  /**
   * The formats it comes in, the vector first, because it is the one to reach for.
   */
  readonly files: readonly MaterialFile[]
  /**
   * What to call it – "Ikon", "Logotyp, vit".
   */
  readonly label: string
  /**
   * The file the tile and its preview show – the pixel version where there is one, because
   * Drive renders a vector only at full size, which is more to fetch for a tile.
   */
  readonly preview: MaterialFile
  /**
   * Which symbol it is.
   */
  readonly shape: SymbolShape
  /**
   * Which tone it is drawn in.
   */
  readonly tone: SymbolTone
}

/**
 * The shapes in the order a unit's card offers them, and what each is called.
 */
const shapes: readonly { readonly label: string; readonly shape: SymbolShape }[] = [
  { label: "Profilbild", shape: "profile" },
  { label: "Ikon", shape: "icon" },
  { label: "Logotyp", shape: "logo" },
]

/**
 * One unit's symbols, gathered from anywhere in the tree: the profile picture, then the
 * icon and the logotype in each tone, each carrying every format it exists in.
 *
 * A unit whose symbols have not been drawn gets an empty list, which is an answer rather
 * than a gap.
 * @param nodes The material tree.
 * @param unitName The unit's name, as the units' identities spell it.
 * @returns The unit's symbols, in the order they are offered.
 */
export function unitSymbols(
  nodes: readonly MaterialNode[],
  unitName: string,
): readonly UnitSymbol[] {
  const own = everyFile(nodes).filter((located) => isUnitsOwn(located.file, unitName))

  return shapes.flatMap(({ label, shape }) =>
    (["color", "white"] as const).flatMap((tone) => {
      const files = vectorFirst(matching(own, shape, tone))
      const preview = files.find((file) => formatRank(file) > 0) ?? files[0]
      return preview === undefined
        ? []
        : [{ files, label: tone === "white" ? `${label}, vit` : label, preview, shape, tone }]
    }),
  )
}

/**
 * Whether a file is the named unit's. The unit's name is the filename up to its first
 * underscore – `björnen_logo_color.svg`.
 * @param file The file, its name already composed.
 * @param unitName The unit's name.
 * @returns Whether the file is that unit's.
 */
function isUnitsOwn(file: MaterialFile, unitName: string): boolean {
  const [stem = ""] = file.name.toLocaleLowerCase("sv").split("_", 1)
  return stem === unitName.normalize("NFC").toLocaleLowerCase("sv")
}

/**
 * Which shape a file is, read from the folders above it rather than its own name. The
 * files were uploaded by many people and a good few are misspelled, while every one of
 * them sits in the right folder.
 * @param trail The names of the folders above the file, outermost first.
 * @returns The shape, or undefined when no folder above it names one.
 */
function shapeOf(trail: readonly string[]): SymbolShape | undefined {
  const path = trail.join("/").toLocaleLowerCase("sv")
  if (path.includes("profilbild")) {
    return "profile"
  }
  if (path.includes("logotyp")) {
    return "logo"
  }
  return path.includes("ikon") ? "icon" : undefined
}

/**
 * The files of one shape and tone.
 * @param located The unit's files, each with its trail.
 * @param shape The shape wanted.
 * @param tone The tone wanted.
 * @returns The files that are both.
 */
function matching(
  located: readonly LocatedFile[],
  shape: SymbolShape,
  tone: SymbolTone,
): readonly MaterialFile[] {
  return located
    .filter((entry) => shapeOf(entry.trail) === shape)
    .filter((entry) => (isDrawnWhite(entry.trail) ? "white" : "color") === tone)
    .map((entry) => entry.file)
}

/**
 * The files with any vector first, then by name.
 * @param files The files to order.
 * @returns The same files, vectors first.
 */
function vectorFirst(files: readonly MaterialFile[]): readonly MaterialFile[] {
  return files.toSorted(
    (left, right) =>
      formatRank(left) - formatRank(right) || left.name.localeCompare(right.name, "sv"),
  )
}

/**
 * Where a format sorts.
 * @param file The file to rank.
 * @returns Zero for a vector and one for anything else.
 */
function formatRank(file: MaterialFile): number {
  return file.mimeType === "image/svg+xml" ? 0 : 1
}
