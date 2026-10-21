import { describe, expect, it } from "vitest"

import { aboutName, byLastActivity, canBeSharedWith, scopeOf, whoSees, type Case } from "./Case"

const opened = {
  createdAt: new Date(2027, 7, 1),
  creatorMemberNo: "1200001",
  extraAccess: [],
  id: "1",
  isClosed: false,
  secrecyLevel: 3,
  title: "Feber",
  troop: "1",
  type: "hälsa",
} as const

describe("naming who a case is about", () => {
  it("names the person the case is about", () => {
    const item: Case = { ...opened, aboutMemberNo: "1100101" }
    const people = new Map([["1100101", { memberNo: "1100101", name: "Lars Lindberg" }]])
    expect(aboutName(item, people)).toBe("Lars Lindberg")
  })

  it("says so for a case about nobody in particular", () => {
    expect(aboutName(opened, undefined)).toBe("Ingen person angiven")
  })
})

describe("reading the scope a case was opened in", () => {
  it("reads a unit's case with its unit", () => {
    expect(scopeOf({ ...opened, troop: "7", type: "avdelning" })).toEqual({
      type: "avdelning",
      unitNumber: 7,
    })
  })

  it("reads any other case without a unit, whatever unit its person is in", () => {
    expect(scopeOf(opened)).toEqual({ type: "hälsa" })
  })
})

describe("saying who sees a case", () => {
  it("names the whole group the type's role reaches on the default level", () => {
    expect(whoSees(opened, "1200001", undefined)).toBe("Hela hälsoteamet ser ärendet.")
    expect(whoSees({ ...opened, troop: "7", type: "avdelning" }, undefined, undefined)).toBe(
      "Alla ledare i avdelning 7 ser ärendet.",
    )
    expect(whoSees({ ...opened, type: "säkerhet" }, undefined, undefined)).toBe(
      "Hela gruppen Säkerhet ser ärendet.",
    )
  })

  it("says that a level 4 case cannot be shared", () => {
    expect(whoSees({ ...opened, secrecyLevel: 4, type: "cmt" }, undefined, undefined)).toBe(
      "Bara CMT ser ärendet, och det kan inte delas.",
    )
  })

  it("tells the creator of a private case that only they see it, and anyone else who does", () => {
    const people = new Map([["1200001", { memberNo: "1200001", name: "Helena Hägg" }]])
    const secret = { ...opened, secrecyLevel: 5 } as const

    expect(whoSees(secret, "1200001", people)).toBe("Bara du ser ärendet.")
    expect(whoSees(secret, "1100101", people)).toBe("Bara Helena Hägg ser ärendet.")
  })
})

describe("who sharing a case would let in", () => {
  const hanna = {
    memberNo: "1100402",
    name: "Hanna Hellström",
    role: "ledare",
    troop: "1",
  } as const
  const anders = {
    memberNo: "1100201",
    name: "Anders Andersson",
    role: "ledare",
    troop: "2",
  } as const
  const karin = { memberNo: "1200401", name: "Karin Kron", role: "kontingentledning" } as const
  const ester = { memberNo: "1300035", name: "Ester Dahl", role: "deltagare", troop: "1" } as const
  const unit = { ...opened, troop: "1", type: "avdelning" } as const

  it("never lets in someone the service would not let open a case", () => {
    expect(canBeSharedWith(opened, ester)).toBe(false)
  })

  it("keeps a unit's case within its unit, to its other leaders while it is private", () => {
    const secret = { ...unit, secrecyLevel: 5 } as const

    expect(canBeSharedWith(unit, hanna)).toBe(false)
    expect(canBeSharedWith(secret, hanna)).toBe(true)
    expect(canBeSharedWith(secret, anders)).toBe(false)
    expect(canBeSharedWith(secret, karin)).toBe(false)
  })

  it("offers a CMT case to the leaders of its person's unit, since CMT sees it already", () => {
    const management = { ...opened, type: "cmt" } as const

    expect(canBeSharedWith(management, hanna)).toBe(true)
    expect(canBeSharedWith(management, anders)).toBe(false)
    expect(canBeSharedWith(management, karin)).toBe(false)
  })

  it("offers a CMT case about somebody without a unit to nobody", () => {
    expect(canBeSharedWith({ ...opened, troop: "", type: "cmt" }, hanna)).toBe(false)
  })

  it("offers any leader or member of CMT a health case", () => {
    expect(canBeSharedWith(opened, anders)).toBe(true)
    expect(canBeSharedWith(opened, karin)).toBe(true)
  })

  it("offers a case of a type it does not know as it offers a health case", () => {
    const safety = { ...opened, type: "säkerhet" } as const

    expect(canBeSharedWith(safety, anders)).toBe(true)
    expect(canBeSharedWith(safety, karin)).toBe(true)
    expect(canBeSharedWith(safety, ester)).toBe(false)
  })

  it("offers CMT a private CMT case, which they do not see", () => {
    expect(canBeSharedWith({ ...opened, secrecyLevel: 5, type: "cmt" }, karin)).toBe(true)
  })
})

describe("ordering cases to act on", () => {
  it("puts the case with the latest note first, and one without notes by its opening", () => {
    const quiet = { ...opened, createdAt: new Date(2027, 7, 3), id: "quiet" }
    const busy = {
      ...opened,
      createdAt: new Date(2027, 7, 1),
      id: "busy",
      latestNoteAt: new Date(2027, 7, 4),
    }
    const old = { ...opened, createdAt: new Date(2027, 7, 2), id: "old" }

    expect(byLastActivity([old, quiet, busy]).map((item) => item.id)).toEqual([
      "busy",
      "quiet",
      "old",
    ])
  })
})
