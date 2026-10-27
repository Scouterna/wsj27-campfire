import { describe, expect, it } from "vitest"

import { toAttachment, toAttachments } from "./AttachmentDto"

/**
 * A picture as the cases service lists it on its note, overridable per test.
 */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 12,
    created_at: "2026-09-26T12:05:00Z",
    creator_id: 1_100_101,
    filename: "utslag.jpg",
    content_type: "image/jpeg",
    width: 2048,
    height: 1536,
    size: 412_000,
    ...overrides,
  }
}

describe("reading one picture", () => {
  it("reads its shape and where both its sizes are read", () => {
    expect(toAttachment(row(), "7", "3")).toEqual({
      height: 1536,
      id: "12",
      picture: "/api/project/cases/7/notes/3/attachments/12",
      thumbnail: "/api/project/cases/7/notes/3/attachments/12?thumbnail=true",
      width: 2048,
    })
  })

  it("encodes a case or a note that would rewrite the path", () => {
    expect(toAttachment(row(), "7?", "3#")).toMatchObject({
      picture: "/api/project/cases/7%3F/notes/3%23/attachments/12",
    })
  })

  it("leaves out a picture with no identifier, or a side that is not a whole pixel count", () => {
    expect(toAttachment(row({ id: undefined }), "7", "3")).toBeUndefined()
    expect(toAttachment(row({ width: 0 }), "7", "3")).toBeUndefined()
    expect(toAttachment(row({ height: 10.5 }), "7", "3")).toBeUndefined()
    expect(toAttachment(row({ height: "1536" }), "7", "3")).toBeUndefined()
    expect(toAttachment("bild", "7", "3")).toBeUndefined()
  })
})

describe("reading a note's pictures", () => {
  it("keeps the service's order, dropping what it cannot show", () => {
    const pictures = toAttachments([row({ id: 1 }), row({ width: -1 }), row({ id: 3 })], "7", "3")

    expect(pictures.map((picture) => picture.id)).toEqual(["1", "3"])
  })

  it("reads a note without a list as having none", () => {
    expect(toAttachments(undefined, "7", "3")).toEqual([])
  })
})
