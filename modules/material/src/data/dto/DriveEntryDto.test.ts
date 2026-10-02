import { describe, expect, it } from "vitest"

import { toMaterialNode } from "./DriveEntryDto"

const png = "image/png"
const folderMime = "application/vnd.google-apps.folder"

describe("converting a Drive entry", () => {
  it("reads a file, with the size Drive sends as a string of digits", () => {
    expect(
      toMaterialNode({ id: "a b", mimeType: "application/pdf", name: "form.pdf", size: "2325300" }),
    ).toEqual({
      downloadUrl: "https://drive.google.com/uc?export=download&id=a%20b",
      id: "a b",
      kind: "file",
      mimeType: "application/pdf",
      name: "form.pdf",
      // eslint-disable-next-line no-secrets/no-secrets -- an address, which only looks random
      pictureUrl: "https://drive.google.com/thumbnail?id=a%20b&sz=w1200",
      size: 2_325_300,
      // eslint-disable-next-line no-secrets/no-secrets -- an address, which only looks random
      thumbnailUrl: "https://drive.google.com/thumbnail?id=a%20b&sz=w320",
      viewerUrl: "https://drive.google.com/file/d/a%20b/view",
    })
  })

  it("draws a vector from its unsized rendering, the only one that keeps transparency", () => {
    const node = toMaterialNode({ id: "v", mimeType: "image/svg+xml", name: "ugglan.svg" })
    expect(node).toMatchObject({
      pictureUrl: "https://lh3.googleusercontent.com/d/v",
      thumbnailUrl: "https://lh3.googleusercontent.com/d/v",
    })
  })

  it.each([
    ["document", "document"],
    ["presentation", "presentation"],
    ["spreadsheet", "spreadsheets"],
  ])("offers a Google %s as a PDF, with no size of its own", (type, path) => {
    const node = toMaterialNode({
      id: "g",
      mimeType: `application/vnd.google-apps.${type}`,
      name: "Instruktion",
      size: "1024",
    })
    expect(node).toMatchObject({
      downloadUrl: `https://docs.google.com/${path}/d/g/export?format=pdf`,
      size: 0,
    })
  })

  it.each(["form", "shortcut"])("drops a Google %s, which is no file to offer", (type) => {
    expect(
      toMaterialNode({ id: "h", mimeType: `application/vnd.google-apps.${type}`, name: "h" }),
    ).toBeUndefined()
  })

  it("reads a folder with its children still to come", () => {
    expect(toMaterialNode({ id: "b", mimeType: folderMime, name: "Avdelningssymboler" })).toEqual({
      children: [],
      id: "b",
      kind: "folder",
      name: "Avdelningssymboler",
    })
  })

  it.each([undefined, "", "many", "-3"])("reads a size of %j as none", (reported) => {
    expect(toMaterialNode({ id: "c", mimeType: png, name: "c.png", size: reported })).toMatchObject(
      {
        size: 0,
      },
    )
  })

  it("composes a name the uploader's file system decomposed", () => {
    const node = toMaterialNode({ id: "d", mimeType: png, name: "bjo\u{308}rnen_SoMe.png" })
    expect(node?.name).toBe("björnen_SoMe.png")
  })

  it.each([".DS_Store", "Icon\r"])("drops %j, which a Mac wrote", (name) => {
    expect(toMaterialNode({ id: "e", mimeType: "application/octet-stream", name })).toBeUndefined()
  })

  it.each([
    ["not an object", "nonsense"],
    // eslint-disable-next-line unicorn/no-null -- the wire can send null, so the converter meets it
    ["null", null],
    ["no id", { mimeType: png, name: "a.png" }],
    ["no name", { id: "f", mimeType: png }],
    ["no media type", { id: "f", name: "a.png" }],
    ["an id that is not a string", { id: 7, mimeType: png, name: "a.png" }],
  ])("drops an entry with %s", (_case, payload) => {
    expect(toMaterialNode(payload)).toBeUndefined()
  })
})
