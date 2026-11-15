import { describe, expect, it } from "vitest"

import { toFaqFolder } from "./FolderDto"

describe("toFaqFolder", () => {
  it("reads a question's moments in UTC, and leaves out one that is not a moment", () => {
    const folder = toFaqFolder({
      folder: {
        id: 7,
        name: "Resa",
        published_articles: [
          {
            created_at: "2025-10-05T11:37:58+02:00",
            id: 1,
            modified_at: "2025-11-02T20:43:13+01:00",
            title: "Hur lång är resan?",
          },
          { created_at: "i går", id: 2, title: "Vem arrangerar resan?" },
        ],
      },
    })

    expect(folder?.questions.map(({ changedAt, createdAt }) => ({ changedAt, createdAt }))).toEqual(
      [
        { changedAt: "2025-11-02T19:43:13.000Z", createdAt: "2025-10-05T09:37:58.000Z" },
        { changedAt: undefined, createdAt: undefined },
      ],
    )
  })

  it("reads nothing that is not a folder as one", () => {
    // As the help center's JSON would carry them, a null included.
    expect(toFaqFolder(JSON.parse('{"folder":null}'))).toBeUndefined()
    expect(toFaqFolder({ folder: [] })).toBeUndefined()
    expect(toFaqFolder({ folder: { id: "7", name: "Resa" } })).toBeUndefined()
    expect(toFaqFolder(JSON.parse("null"))).toBeUndefined()
  })
})
