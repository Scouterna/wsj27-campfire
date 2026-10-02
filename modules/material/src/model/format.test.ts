import { describe, expect, it } from "vitest"

import { baseName, fileCount, fileFacts, fileSize, typeName } from "./format"
import type { MaterialFile } from "./MaterialNode"

/**
 * A file of a type and a size.
 * @param name The file's name.
 * @param mimeType Its media type.
 * @param size Its size in bytes.
 * @returns The file.
 */
function file(name: string, mimeType: string, size = 0): MaterialFile {
  return {
    downloadUrl: "",
    id: name,
    kind: "file",
    mimeType,
    name,
    pictureUrl: "",
    size,
    thumbnailUrl: "",
    viewerUrl: "",
  }
}

describe("what a file is called", () => {
  it("names a known media type whatever the extension says", () => {
    expect(typeName(file("mall.potx", "application/vnd.ms-powerpoint"))).toBe("PowerPoint")
  })

  it("names a Google document by what its download is", () => {
    expect(typeName(file("Instruktion", "application/vnd.google-apps.document"))).toBe("PDF")
  })

  it("falls back to the extension, and then to nothing", () => {
    expect(typeName(file("karta.kml", "application/octet-stream"))).toBe("KML")
    expect(typeName(file("README", "application/octet-stream"))).toBe("")
    expect(typeName(file(".hidden", "application/octet-stream"))).toBe("")
  })

  it("drops the extension from the name", () => {
    expect(baseName("WSJ27SE_form version 8.pdf")).toBe("WSJ27SE_form version 8")
    expect(baseName("README")).toBe("README")
  })
})

describe("what a file weighs", () => {
  it.each([
    [0, ""],
    [512, "512 B"],
    [96_000, "96 kB"],
    [2_325_300, "2,3 MB"],
  ])("says %d bytes as %j", (bytes, said) => {
    // Swedish puts a no-break space between the value and its unit.
    expect(fileSize(bytes).replaceAll(" ", " ")).toBe(said)
  })

  it("leaves out a size Drive did not report", () => {
    expect(fileFacts(file("mall.potx", "application/vnd.ms-powerpoint"))).toBe("PowerPoint")
    expect(fileFacts(file("form.pdf", "application/pdf", 2_325_300))).toMatch(/^PDF · 2,3/u)
  })

  it("counts files in Swedish", () => {
    expect(fileCount(1)).toBe("1 fil")
    expect(fileCount(24)).toBe("24 filer")
  })
})
