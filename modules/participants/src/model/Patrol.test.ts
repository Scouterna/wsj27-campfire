import { describe, expect, it } from "vitest"

import type { Participant } from "./Participant"
import {
  dealtOut,
  distanceKm,
  draftOf,
  leaderOf,
  membersOf,
  moved,
  movedAll,
  patrolName,
  patrolSections,
  patrolStats,
  patrolWrites,
  renamed,
  sharedNames,
  withLeader,
  withPatrols,
  type Coordinates,
} from "./Patrol"

/**
 * A scout of unit 2, overridable per case.
 */
function scout(memberNo: string, overrides: Partial<Participant> = {}): Participant {
  return {
    firstName: "Scout",
    lastName: memberNo,
    memberNo,
    role: "deltagare",
    unitNumber: 2,
    ...overrides,
  }
}

const towns: ReadonlyMap<string, Coordinates> = new Map([
  ["Stockholm", { latitude: 59.33, longitude: 18.07 }],
  ["Uppsala", { latitude: 59.86, longitude: 17.64 }],
])

/**
 * Where a town is, for the two towns the tests place.
 * @param town The town.
 * @returns Its place, or undefined for any other.
 */
function locate(town: string): Coordinates | undefined {
  return towns.get(town)
}

const unit: readonly Participant[] = [
  scout("1", { patrol: "Vargarna" }),
  scout("2", { patrol: "Falkarna" }),
  scout("3"),
  scout("4", { patrol: "Falkarna", role: "ledare" }),
  { firstName: "Scout", lastName: "5", memberNo: "5", role: "ist" },
]

describe("starting a draft from the unit", () => {
  it("puts the named patrols first, alphabetically, and leaves the rest unnamed", () => {
    const draft = draftOf(unit)

    expect(draft.names).toEqual(["Falkarna", "Vargarna", "", ""])
    expect(draft.placements).toEqual(
      new Map([
        ["1", 1],
        ["2", 0],
        ["4", 0],
      ]),
    )
  })

  it("keeps a place for every patrol the people name, past four", () => {
    const people = ["A", "B", "C", "D", "E"].map((patrol, index) =>
      scout(String(index), { patrol }),
    )

    expect(draftOf(people).names).toEqual(["A", "B", "C", "D", "E"])
  })
})

describe("arranging the draft", () => {
  it("names an unnamed patrol by its place", () => {
    const draft = renamed(draftOf(unit), 2, " ".repeat(3))

    expect(patrolName(draft, 2)).toBe("Patrull 3")
    expect(patrolName(renamed(draft, 2, " Ugglorna "), 2), "trimmed").toBe("Ugglorna")
  })

  it("moves a person into a patrol, between two, and out again", () => {
    let draft = moved(draftOf(unit), "3", 2)
    expect(membersOf(unit, draft, 2).map((person) => person.memberNo)).toEqual(["3"])

    draft = moved(draft, "3", 0)
    expect(membersOf(unit, draft, 0).map((person) => person.memberNo)).toEqual(["2", "3", "4"])

    draft = moved(draft, "3", undefined)
    expect(membersOf(unit, draft, undefined).map((person) => person.memberNo)).toEqual(["3"])
  })

  it("moves several people together", () => {
    const draft = movedAll(draftOf(unit), ["1", "3"], 3)

    expect(membersOf(unit, draft, 3).map((person) => person.memberNo)).toEqual(["1", "3"])
  })

  it("never counts somebody outside the unit's scouts and leaders among the unplaced", () => {
    expect(membersOf(unit, draftOf(unit), undefined).map((person) => person.memberNo)).toEqual([
      "3",
    ])
  })

  it("finds two patrols under one name, whatever the case", () => {
    const draft = renamed(draftOf(unit), 2, "falkarna")

    expect(sharedNames(draft)).toEqual(["Falkarna"])
  })

  it("counts a typed name against an unnamed patrol's own", () => {
    const draft = renamed(draftOf(unit), 3, "patrull 3")

    expect(sharedNames(draft)).toEqual(["Patrull 3"])
  })
})

describe("saving the draft", () => {
  it("writes nobody for a draft nobody touched", () => {
    expect(patrolWrites(unit, draftOf(unit))).toEqual([])
  })

  it("writes the people who moved, and a null for the one taken out", () => {
    const draft = moved(moved(draftOf(unit), "3", 3), "1", undefined)

    expect(patrolWrites(unit, draft)).toEqual([
      // eslint-disable-next-line unicorn/no-null -- the service takes null to store no patrol
      { memberNo: "1", patrol: null },
      { memberNo: "3", patrol: "Patrull 4" },
    ])
  })

  it("writes every person in a renamed patrol", () => {
    const draft = renamed(draftOf(unit), 0, "Örnarna")

    expect(patrolWrites(unit, draft)).toEqual([
      { memberNo: "2", patrol: "Örnarna" },
      { memberNo: "4", patrol: "Örnarna" },
    ])
  })

  it("applies what was saved to the people, dropping a cleared patrol's key", () => {
    const saved = withPatrols(unit, [
      // eslint-disable-next-line unicorn/no-null -- as the service was asked to store it
      { memberNo: "1", patrol: null },
      { memberNo: "3", patrol: "Ugglorna" },
    ])

    expect(saved[0]).not.toHaveProperty("patrol")
    expect(saved[2]?.patrol).toBe("Ugglorna")
    expect(saved[1]).toBe(unit[1])
  })
})

describe("weighing a patrol", () => {
  const today = new Date(2027, 6, 30)

  it("counts genders, kårer, ages, and spread over the scouts, and names the leaders", () => {
    const members = [
      scout("1", {
        birthDate: "2013-01-01",
        gender: "kvinna",
        homeTown: "Stockholm",
        memberGroup: "Fejkbo",
      }),
      scout("2", {
        birthDate: "2011-06-01",
        gender: "kvinna",
        homeTown: "Uppsala",
        memberGroup: "Fejkbo",
      }),
      scout("3", { gender: "man", homeTown: "Atlantis", memberGroup: "Mockåsen" }),
      scout("4", { birthDate: "1990-01-01", gender: "man", role: "ledare" }),
    ]

    const stats = patrolStats(members, today, locate)

    expect(stats.scouts).toBe(3)
    expect(stats.genders).toEqual(
      new Map([
        ["kvinna", 2],
        ["man", 1],
      ]),
    )
    expect(stats.groups).toEqual({ count: 2, largest: { count: 2, name: "Fejkbo" } })
    expect(stats.ages).toEqual({ average: 15, oldest: 16, youngest: 14 })
    expect(stats.leaders.map((leader) => leader.memberNo)).toEqual(["4"])
    expect(stats.spreadKm).toBeCloseTo(64, 0)
  })

  it("leaves out what nobody in the patrol has", () => {
    const stats = patrolStats([scout("1")], today, locate)

    expect(stats).not.toHaveProperty("ages")
    expect(stats).not.toHaveProperty("spreadKm")
    expect(stats.groups).toEqual({ count: 0 })
  })

  it("measures a distance over the earth's surface", () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(
      111.2,
      1,
    )
  })
})

/**
 * A tie-breaker that never breaks a tie differently, so a deal is the same every run.
 * @returns The middle of the range.
 */
function fixed(): number {
  return 0.5
}

describe("dealing the scouts out", () => {
  const groups = ["Fejkbo", "Mockåsen", "Stubbhult"]
  const scouts = Array.from({ length: 36 }, (_, index) =>
    scout(String(index), {
      gender: index % 2 === 0 ? "kvinna" : "man",
      memberGroup: groups[index % groups.length] ?? "",
    }),
  )
  const leaders = [scout("L", { role: "ledare" })]
  const people = [...scouts, ...leaders]

  it("fills every patrol evenly and leaves the leaders where they were", () => {
    const draft = dealtOut(people, draftOf(people), "all", fixed)

    expect([0, 1, 2, 3].map((index) => membersOf(scouts, draft, index).length)).toEqual([
      9, 9, 9, 9,
    ])
    expect(draft.placements.has("L")).toBe(false)
  })

  it("mixes genders and kårer rather than clumping them", () => {
    const draft = dealtOut(people, draftOf(people), "all", fixed)

    for (const index of [0, 1, 2, 3]) {
      const stats = patrolStats(membersOf(scouts, draft, index), new Date(), locate)
      expect(stats.genders.get("kvinna") ?? 0).toBeGreaterThanOrEqual(4)
      expect(stats.groups.count).toBe(3)
    }
  })

  it("places only the unplaced when asked to, leaving the rest where they were", () => {
    const start = moved(moved(draftOf(people), "0", 3), "1", 3)
    const draft = dealtOut(people, start, "unplaced", fixed)

    expect(draft.placements.get("0")).toBe(3)
    expect(draft.placements.get("1")).toBe(3)
    expect(membersOf(scouts, draft, undefined)).toEqual([])
  })
})

describe("grouping a unit by patrol", () => {
  it("gives a section per patrol, leaders first, and the rest last", () => {
    const sections = patrolSections(unit)

    expect(sections.map((section) => section.label)).toEqual([
      "Falkarna",
      "Vargarna",
      "Utan patrull",
    ])
    expect(sections[0]?.people.map((person) => person.memberNo)).toEqual(["4", "2"])
    expect(sections[2]?.people.map((person) => person.memberNo)).toEqual(["3"])
  })

  it("gives nothing for a unit nobody has divided", () => {
    expect(patrolSections([scout("1"), scout("2")])).toEqual([])
  })
})

describe("leading the patrols", () => {
  const leaders = [
    scout("A", { patrol: "Falkarna", role: "ledare" }),
    scout("B", { patrol: "Vargarna", role: "ledare" }),
    scout("C", { role: "ledare" }),
  ]
  const people = [
    ...leaders,
    scout("1", { patrol: "Falkarna" }),
    scout("2", { patrol: "Vargarna" }),
  ]

  it("names the leader placed in a patrol, and nobody for one without", () => {
    const draft = draftOf(people)

    expect(leaderOf(people, draft, 0)?.memberNo).toBe("A")
    expect(leaderOf(people, draft, 2)).toBeUndefined()
  })

  it("gives a patrol a free leader, moving its old one out of the patrols", () => {
    const draft = withLeader(people, draftOf(people), 0, "C")

    expect(leaderOf(people, draft, 0)?.memberNo).toBe("C")
    expect(draft.placements.has("A")).toBe(false)
  })

  it("swaps two leaders when the one chosen already leads another patrol", () => {
    const draft = withLeader(people, draftOf(people), 0, "B")

    expect(leaderOf(people, draft, 0)?.memberNo).toBe("B")
    expect(leaderOf(people, draft, 1)?.memberNo).toBe("A")
  })

  it("leaves a patrol without a leader, and its scouts where they are", () => {
    const draft = withLeader(people, draftOf(people), 1, undefined)

    expect(leaderOf(people, draft, 1)).toBeUndefined()
    expect(draft.placements.get("2")).toBe(1)
  })
})
