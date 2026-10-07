import { describe, expect, it } from "vitest"

import type { MaterialFile, MaterialFolder, MaterialNode } from "./MaterialNode"
import { unitSymbols } from "./unit-symbols"

const png = "image/png"
const svg = "image/svg+xml"

/**
 * A file of a type.
 * @param name The file's name, which is also its id.
 * @param mimeType Its media type.
 * @returns The file.
 */
function file(name: string, mimeType: string): MaterialFile {
  return {
    downloadUrl: "",
    id: name,
    kind: "file",
    mimeType,
    name,
    pictureUrl: "",
    size: 0,
    thumbnailUrl: "",
    viewerUrl: "",
  }
}

/**
 * A folder holding what it is given.
 * @param name The folder's name, which is also its id.
 * @param children What it holds.
 * @returns The folder.
 */
function folder(name: string, children: readonly MaterialNode[]): MaterialFolder {
  return { children, id: name, kind: "folder", name }
}

const coloredIcons = folder("Färgade", [
  folder("Pixelfiler (PNG)", [file("björnen_icon_color.png", png)]),
  folder("Vektorfiler (SVG)", [file("björnen_icon_color.svg", svg)]),
])
// Misnamed on purpose, because the folder decides the tone and not the name.
const whiteIcons = folder("Icke-färgade (vita)", [
  folder("Pixelfiler (PNG)", [file("björnen_icon.png", png)]),
])
const coloredLogos = folder("färgade", [file("ugglan_logo_color.svg", svg)])

const tree: readonly MaterialNode[] = [
  folder("avdelningar - profilbilder", [file("björnen_SoMe.png", png)]),
  folder("avdelningsikoner", [coloredIcons, whiteIcons]),
  folder("avdelningslogotyper", [coloredLogos]),
]

describe("a unit's own symbols", () => {
  it("gathers them from every folder, in the order the card offers them", () => {
    const symbols = unitSymbols(tree, "Björnen")

    expect(symbols.map((symbol) => symbol.label)).toEqual(["Profilbild", "Ikon", "Ikon, vit"])
  })

  it("offers the vector first, and shows the pixel version", () => {
    const [, icon] = unitSymbols(tree, "Björnen")

    expect(icon?.files.map((each) => each.name)).toEqual([
      "björnen_icon_color.svg",
      "björnen_icon_color.png",
    ])
    expect(icon?.preview.name).toBe("björnen_icon_color.png")
  })

  it("matches a unit name spelled with the letters composed differently", () => {
    expect(unitSymbols(tree, "Bjo\u{308}rnen")).toHaveLength(3)
  })

  it("gives nothing for a unit with no symbols drawn", () => {
    expect(unitSymbols(tree, "Abborren")).toEqual([])
  })

  it("does not take another unit whose name begins the same way", () => {
    expect(unitSymbols([file("björnenstam_SoMe.png", png)], "Björnen")).toEqual([])
  })
})
