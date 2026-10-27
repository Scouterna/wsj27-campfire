import { describe, expect, it } from "vitest"

import {
  aboutName,
  byLastActivity,
  canBeSharedWith,
  holderCount,
  isAboutUnit,
  scopeOf,
  seenBy,
  sharedCount,
  unitsOfCase,
  type Case,
} from "./Case"
import type { Person } from "./Person"

const opened = {
  aboutMemberNos: [],
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
  const people = new Map([
    ["1100101", { memberNo: "1100101", name: "Lars Lindberg" }],
    ["1300035", { memberNo: "1300035", name: "Ester Dahl" }],
    ["1300049", { memberNo: "1300049", name: "Ivar Forsberg" }],
  ])

  it("names the person the case is about", () => {
    const item: Case = { ...opened, aboutMemberNos: ["1100101"] }
    expect(aboutName(item, people)).toBe("Lars Lindberg")
  })

  it("joins two people, and names the first of more with how many besides", () => {
    const two: Case = { ...opened, aboutMemberNos: ["1300035", "1300049"] }
    const three: Case = { ...opened, aboutMemberNos: ["1300035", "1300049", "1100101"] }

    expect(aboutName(two, people)).toBe("Ester Dahl och Ivar Forsberg")
    expect(aboutName(three, people)).toBe("Ester Dahl och 2 till")
  })

  it("names the unit of a case about a unit as a whole, as the whole unit to its own leader", () => {
    expect(aboutName(opened, people)).toBe("Avdelning 1")
    expect(aboutName(opened, people, 1)).toBe("Hela avdelningen")
    expect(aboutName(opened, people, 2)).toBe("Avdelning 1")
    expect(isAboutUnit(opened)).toBe(true)
    expect(isAboutUnit({ ...opened, aboutMemberNos: ["1300035"] })).toBe(false)
  })

  it("says so for a case about nobody in particular", () => {
    const nobody: Case = { ...opened, troop: "" }

    expect(aboutName(nobody, undefined)).toBe("Ingen person angiven")
    expect(isAboutUnit(nobody)).toBe(false)
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
    expect(canBeSharedWith(opened, ester, undefined)).toBe(false)
  })

  it("keeps a unit's case within its unit, to its other leaders while it is private", () => {
    const secret = { ...unit, secrecyLevel: 5 } as const

    expect(canBeSharedWith(unit, hanna, undefined)).toBe(false)
    expect(canBeSharedWith(secret, hanna, undefined)).toBe(true)
    expect(canBeSharedWith(secret, anders, undefined)).toBe(false)
    expect(canBeSharedWith(secret, karin, undefined)).toBe(false)
  })

  it("offers a CMT case to the leaders of its person's unit, since CMT sees it already", () => {
    const management = { ...opened, type: "cmt" } as const

    expect(canBeSharedWith(management, hanna, undefined)).toBe(true)
    expect(canBeSharedWith(management, anders, undefined)).toBe(false)
    expect(canBeSharedWith(management, karin, undefined)).toBe(false)
  })

  it("offers a CMT case about somebody without a unit to nobody", () => {
    expect(canBeSharedWith({ ...opened, troop: "", type: "cmt" }, hanna, undefined)).toBe(false)
  })

  it("offers any leader or member of CMT a health case", () => {
    expect(canBeSharedWith(opened, anders, undefined)).toBe(true)
    expect(canBeSharedWith(opened, karin, undefined)).toBe(true)
  })

  it("offers a case of a type it does not know as it offers a health case", () => {
    const safety = { ...opened, type: "säkerhet" } as const

    expect(canBeSharedWith(safety, anders, undefined)).toBe(true)
    expect(canBeSharedWith(safety, karin, undefined)).toBe(true)
    expect(canBeSharedWith(safety, ester, undefined)).toBe(false)
  })

  it("offers a CMT case to the leaders of the units of the people it is about now", () => {
    const ivar = {
      memberNo: "1300049",
      name: "Ivar Forsberg",
      role: "deltagare",
      troop: "2",
    } as const
    const placed = new Map<string, Person>([
      [ester.memberNo, ester],
      [ivar.memberNo, ivar],
    ])
    const both: Case = { ...opened, aboutMemberNos: [ester.memberNo, ivar.memberNo], type: "cmt" }
    const moved: Case = { ...both, aboutMemberNos: [ivar.memberNo] }

    expect(canBeSharedWith(both, hanna, placed)).toBe(true)
    expect(canBeSharedWith(both, anders, placed)).toBe(true)
    expect(canBeSharedWith(moved, hanna, placed)).toBe(false)
    expect(canBeSharedWith(moved, anders, placed)).toBe(true)
  })

  it("offers CMT a private CMT case, which they do not see", () => {
    expect(canBeSharedWith({ ...opened, secrecyLevel: 5, type: "cmt" }, karin, undefined)).toBe(
      true,
    )
  })

  it("never offers a health case to the health team, which sees it already", () => {
    const helena = {
      funktion: "Hälsosupport",
      memberNo: "1200002",
      name: "Helena Hägg",
      role: "kontingentledning",
    } as const

    expect(canBeSharedWith(opened, helena, undefined)).toBe(false)
    expect(canBeSharedWith(opened, karin, undefined)).toBe(true)
    expect(canBeSharedWith({ ...opened, secrecyLevel: 5 }, helena, undefined)).toBe(true)
  })
})

describe("reading the units a case is about", () => {
  const people = new Map([
    ["1300035", { memberNo: "1300035", name: "Ester Dahl", troop: "7" }],
    ["1300049", { memberNo: "1300049", name: "Ivar Forsberg", troop: "2" }],
    ["1300077", { memberNo: "1300077", name: "Alva Berg", troop: "7" }],
    ["1200401", { memberNo: "1200401", name: "Karin Kron", troop: "CMT" }],
  ])

  it("reads the units of the people, once each and lowest first, over the opening unit", () => {
    const item: Case = { ...opened, aboutMemberNos: ["1300035", "1300049", "1300077", "1200401"] }

    expect(unitsOfCase(item, people)).toEqual([2, 7])
    expect(unitsOfCase(item, undefined)).toEqual([])
  })

  it("keeps the unit of a unit's own case, and of a case about a unit as a whole", () => {
    const own: Case = { ...opened, aboutMemberNos: ["1300049"], type: "avdelning" }

    expect(unitsOfCase(own, people)).toEqual([1])
    expect(unitsOfCase(opened, people)).toEqual([1])
    expect(unitsOfCase({ ...opened, troop: "" }, people)).toEqual([])
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

describe("summing up who sees a case", () => {
  const people = new Map<string, Person>([
    ["1100101", { memberNo: "1100101", name: "Lars Lindberg", role: "ledare", troop: "1" }],
    ["1100102", { memberNo: "1100102", name: "Hanna Hellström", role: "ledare", troop: "1" }],
    ["1100201", { memberNo: "1100201", name: "Anders Andersson", role: "ledare", troop: "2" }],
    [
      "1200001",
      {
        funktion: "Hälsosupport",
        memberNo: "1200001",
        name: "Helena Hägg",
        role: "kontingentledning",
      },
    ],
    [
      "1200401",
      { funktion: "Ledning", memberNo: "1200401", name: "Karin Kron", role: "kontingentledning" },
    ],
  ])

  it("names the group a level 3 or 4 case reaches", () => {
    expect(seenBy(opened, "1200001", people)).toBe("Hela hälsoteamet")
    expect(seenBy({ ...opened, secrecyLevel: 4, type: "cmt" }, undefined, people)).toBe("Bara CMT")
    const unitCase: Case = { ...opened, type: "avdelning" }
    expect(seenBy(unitCase, "1100101", people, 1)).toBe("Alla ledare i avdelningen")
    expect(seenBy(unitCase, "1100201", people)).toBe("Alla ledare i avdelning 1")
  })

  it("names a private case's creator, alone or beside those it is shared with", () => {
    const secret: Case = { ...opened, secrecyLevel: 5 }
    expect(seenBy(secret, "1200001", people)).toBe("Bara du")
    expect(seenBy(secret, "1200401", people)).toBe("Bara Helena Hägg")
    const shared: Case = { ...secret, extraAccess: ["1200401"] }
    expect(seenBy(shared, "1200001", people)).toBe("Du")
    expect(seenBy(shared, "1200401", people)).toBe("Helena Hägg")
  })

  it("counts those it is shared with as leaders where every one is", () => {
    expect(sharedCount([], people)).toBeUndefined()
    expect(sharedCount(["1100101", "1100102"], people)).toBe("2 ledare")
    expect(sharedCount(["1200401"], people)).toBe("1 person")
    expect(sharedCount(["1200401", "1100101"], people)).toBe("2 personer")
    expect(sharedCount(["1200401"], undefined)).toBe("1 person")
  })

  it("counts the holders of the type's role where the list of participants can tell", () => {
    expect(holderCount(opened, people)).toBe(1)
    expect(holderCount({ ...opened, type: "cmt" }, people)).toBe(2)
    expect(holderCount({ ...opened, type: "avdelning" }, people)).toBe(2)
    expect(holderCount({ ...opened, type: "säkerhet" }, people)).toBeUndefined()
    expect(holderCount(opened, undefined)).toBeUndefined()
  })

  it("cannot count the health team from names read without their functions", () => {
    // A leader reads the management at the name level, which carries no function.
    const names = new Map<string, Person>([
      ...people,
      ["1200003", { memberNo: "1200003", name: "Hanna Hed", role: "kontingentledning" }],
    ])

    expect(holderCount(opened, names)).toBeUndefined()
    expect(holderCount({ ...opened, type: "cmt" }, names)).toBe(3)
  })
})
