import type { MaterialFile, MaterialFolder, MaterialNode } from "../../model/MaterialNode"

/**
 * A mark drawn in an ink color, standing in for a colored symbol's thumbnail.
 */
export const inkedMark =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='%23b8860b'/%3E%3C/svg%3E"

/**
 * The same mark in white, standing in for a white symbol's thumbnail.
 */
export const whiteMark =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='white'/%3E%3C/svg%3E"

/**
 * A file whose picture is drawn rather than fetched, because nothing in Storybook
 * touches a network.
 * @param name The file's name, which is also its id.
 * @param mimeType Its media type.
 * @param size Its size in bytes.
 * @param thumbnailUrl Its picture.
 * @returns The file.
 */
function file(name: string, mimeType: string, size: number, thumbnailUrl: string): MaterialFile {
  return {
    downloadUrl: "#",
    id: name,
    kind: "file",
    mimeType,
    name,
    pictureUrl: thumbnailUrl,
    size,
    thumbnailUrl,
    viewerUrl: "#",
  }
}

/**
 * A folder holding what it is given.
 * @param id The folder's id.
 * @param name The folder's name.
 * @param children What it holds.
 * @returns The folder.
 */
function folder(id: string, name: string, children: readonly MaterialNode[]): MaterialFolder {
  return { children, id, kind: "folder", name }
}

const png = "image/png"
const svg = "image/svg+xml"

/**
 * One kind of symbol for Björnen in color and in white, each in both formats, in the
 * shared folders' own shape.
 * @param id The folder's id.
 * @param name The folder's name.
 * @param kind The word the files are named with, "icon" or "logo".
 * @returns The folder.
 */
function symbolFolder(id: string, name: string, kind: string): MaterialFolder {
  return folder(id, name, [
    toneFolder(`${id}-color`, "Färgade", `björnen_${kind}_color`, inkedMark),
    toneFolder(`${id}-white`, "Icke-färgade (vita)", `björnen_${kind}_white`, whiteMark),
  ])
}

/**
 * One tone of a symbol, in a folder per format as the shared folders hold them.
 * @param id The folder's id.
 * @param name The folder's name.
 * @param stem The files' name without its extension.
 * @param thumbnailUrl The files' picture.
 * @returns The folder.
 */
function toneFolder(id: string, name: string, stem: string, thumbnailUrl: string): MaterialFolder {
  const pixels = file(`${stem}.png`, png, 23_962, thumbnailUrl)
  const vector = file(`${stem}.svg`, svg, 2460, thumbnailUrl)
  return folder(id, name, [
    folder(`${id}-png`, "Pixelfiler (PNG)", [pixels]),
    folder(`${id}-svg`, "Vektorfiler (SVG)", [vector]),
  ])
}

/**
 * The folder the folder stories open first: the top of the symbols, which holds only
 * folders.
 */
export const symbolsFolder = "symbols"

/**
 * The folder of white icons, where the tiles sit on the dark backdrop.
 */
export const whiteIconsFolder = "icons-white-png"

/**
 * The material the stories render: one unit's symbols, a template, and a document at the
 * top, read in reading order.
 */
export const materialTree: readonly MaterialNode[] = [
  folder(symbolsFolder, "Avdelningssymboler", [
    folder("profiles", "avdelningar - profilbilder", [
      file("björnen_SoMe.png", png, 90_519, inkedMark),
    ]),
    symbolFolder("icons", "avdelningsikoner", "icon"),
    symbolFolder("logos", "avdelningslogotyper", "logo"),
  ]),
  folder("templates", "mallar till dokument och presentation", [
    file(
      "Presentationsmall.potx",
      "application/vnd.openxmlformats-officedocument.presentationml.template",
      27_376_052,
      inkedMark,
    ),
  ]),
  file("WSJ27SE_form version 8.pdf", "application/pdf", 2_325_300, inkedMark),
]
