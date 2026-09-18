import { describe, expect, it } from "vitest"

import { toParticipantsSearch } from "./search"

describe("what narrowing an address carries", () => {
  it("reads a search text and a role filter", () => {
    expect(toParticipantsSearch({ q: "Ester", roll: "deltagare" })).toStrictEqual({
      q: "Ester",
      roll: "deltagare",
    })
  })

  it("carries nothing out of an address that carries nothing", () => {
    expect(toParticipantsSearch({})).toStrictEqual({})
  })

  it("trims the search text", () => {
    expect(toParticipantsSearch({ q: "  Ester  " })).toStrictEqual({ q: "Ester" })
  })

  it("drops a search text that is empty or only whitespace", () => {
    expect(toParticipantsSearch({ q: "" })).toStrictEqual({})
    expect(toParticipantsSearch({ q: " ".repeat(3) })).toStrictEqual({})
  })

  it("drops a search text that is not a string", () => {
    expect(toParticipantsSearch({ q: 42 })).toStrictEqual({})
    expect(toParticipantsSearch({ q: ["Ester"] })).toStrictEqual({})
  })

  it("keeps each of the four role filters", () => {
    for (const roll of ["cmt", "deltagare", "ist", "ledare"]) {
      expect(toParticipantsSearch({ roll })).toStrictEqual({ roll })
    }
  })

  it("drops a role filter the chips do not offer", () => {
    expect(toParticipantsSearch({ roll: "kontingentledning" })).toStrictEqual({})
    expect(toParticipantsSearch({ roll: "alla" })).toStrictEqual({})
    expect(toParticipantsSearch({ roll: 1 })).toStrictEqual({})
  })

  it("ignores every other param a stale address brings along", () => {
    expect(toParticipantsSearch({ q: "Ester", filter: "Ledare", page: 3 })).toStrictEqual({
      q: "Ester",
    })
  })
})
