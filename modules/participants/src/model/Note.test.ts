import { describe, expect, it } from "vitest"

import { notesToLeader, type Note } from "./Note"

describe("the notes to a unit's leader", () => {
  it("leave out what was addressed to the contingent management alone", () => {
    const toLeader: Note = { audience: "avdelningsledaren", text: "Sover dåligt i tält." }
    const toManagement: Note = { audience: "kontingentledningen", text: "Privat." }

    expect(notesToLeader([toManagement, toLeader])).toEqual([toLeader])
    expect(notesToLeader([toManagement])).toEqual([])
  })
})
