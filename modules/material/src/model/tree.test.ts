import { describe, expect, it } from "vitest"

import type { MaterialFile, MaterialFolder, MaterialNode } from "./MaterialNode"
import { countFiles, everyFile, inReadingOrder, searchFiles, trailTo } from "./tree"

/**
 * A file with nothing about it but its name.
 * @param name The file's name, which is also its id.
 * @returns The file.
 */
function file(name: string): MaterialFile {
  return {
    downloadUrl: "",
    id: name,
    kind: "file",
    mimeType: "image/png",
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

const vectors = folder("Vektorfiler (SVG)", [
  file("ugglan_icon_white.svg"),
  file("björnen_icon.svg"),
])
const icons = folder("avdelningsikoner", [vectors])
const tree: readonly MaterialNode[] = [
  folder("Avdelningssymboler", [icons]),
  file("Grafisk profil.pdf"),
]

describe("the reading order", () => {
  it("puts folders before files, each in Swedish alphabetical order", () => {
    const nodes = [file("ärlig.png"), file("abborren.png"), folder("Ögon", []), folder("Arkiv", [])]

    expect(inReadingOrder(nodes).map((node) => node.name)).toEqual([
      "Arkiv",
      "Ögon",
      "abborren.png",
      "ärlig.png",
    ])
  })
})

describe("walking the tree", () => {
  it("finds every file, with the folders above it", () => {
    expect(everyFile(tree).map(({ file: { name }, trail }) => [name, trail])).toEqual([
      ["ugglan_icon_white.svg", ["Avdelningssymboler", "avdelningsikoner", "Vektorfiler (SVG)"]],
      ["björnen_icon.svg", ["Avdelningssymboler", "avdelningsikoner", "Vektorfiler (SVG)"]],
      ["Grafisk profil.pdf", []],
    ])
  })

  it("counts the files under a folder that holds only folders", () => {
    const [symbols] = tree
    expect(symbols?.kind === "folder" && countFiles(symbols)).toBe(2)
  })

  it("gives the trail down to a folder, the folder itself last", () => {
    expect(trailTo(tree, "avdelningsikoner").map((step) => step.name)).toEqual([
      "Avdelningssymboler",
      "avdelningsikoner",
    ])
    expect(trailTo(tree, "nowhere")).toEqual([])
  })
})

describe("the search", () => {
  it("matches every word, in any order, against the name and the folders", () => {
    expect(searchFiles(tree, "svg UGGLAN").map((hit) => hit.file.name)).toEqual([
      "ugglan_icon_white.svg",
    ])
  })

  it("finds a name typed with the letters composed differently", () => {
    // The same "ö" as a base letter and a combining diaeresis, as a Mac might type it.
    expect(searchFiles(tree, "bjo\u{308}rnen")).toHaveLength(1)
  })

  it("finds nothing for a query with no words in it", () => {
    expect(searchFiles(tree, " ".repeat(3))).toEqual([])
  })
})
