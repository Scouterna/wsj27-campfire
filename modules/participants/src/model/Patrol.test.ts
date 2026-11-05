import { describe, expect, it } from "vitest"

import type { Participant } from "./Participant"
import {
  dealtOut,
  draftOf,
  membersOf,
  moved,
  movedAll,
  patrolName,
  patrolNames,
  patrolSections,
  patrolStats,
  patrolWrites,
  placeName,
  rebased,
  renamed,
  sharedNames,
  withPatrols,
} from "./Patrol"
import { unitNumbered } from "./Unit"

/**
 * A scout of unit 2, overridable per case.
 */
function scout(memberNo: string, overrides: Partial<Participant> = {}): Participant {
  return {
    firstName: "Scout",
    lastName: memberNo,
    memberNo,
    role: "deltagare",
    unit: unitNumbered(2),
    ...overrides,
  }
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
      ]),
    )
  })

  it("takes numbers and hand-typed names as they are", () => {
    const people = [scout("1", { patrol: "12" }), scout("2", { patrol: "patrull ett" })]

    expect(draftOf(people).names).toEqual(["12", "patrull ett", "", ""])
  })

  it("opens no place for a value entered by hand on a ledare", () => {
    const people = [
      scout("1", { patrol: "Falkarna" }),
      scout("2", { patrol: "Ek", role: "ledare" }),
    ]
    const draft = draftOf(people)

    expect(draft.names).toEqual(["Falkarna", "", "", ""])
    expect(draft.placements.has("2")).toBe(false)
  })

  it("puts a patrol saved under a place's own name back in that place", () => {
    const draft = draftOf([scout("1", { patrol: "Patrull 2" })])

    expect(draft.names).toEqual(["", "Patrull 2", "", ""])
    expect(sharedNames(draft)).toEqual([])
    expect(patrolWrites([scout("1", { patrol: "Patrull 2" })], draft)).toEqual([])
  })

  it("houses own names and given names without either taking the other's place", () => {
    const people = [
      scout("1", { patrol: "Patrull 1" }),
      scout("2", { patrol: "Patrull 3" }),
      scout("3", { patrol: "Falkarna" }),
    ]

    expect(draftOf(people).names).toEqual(["Patrull 1", "Falkarna", "Patrull 3", ""])
  })

  it("keeps a patrol in the place it had when told where that was", () => {
    const people = [scout("1", { patrol: "Örnarna" }), scout("2", { patrol: "Ugglorna" })]

    expect(draftOf(people, ["", "", "Ugglorna", "Örnarna"]).names).toEqual([
      "",
      "",
      "Ugglorna",
      "Örnarna",
    ])
  })

  it("gives two patrols wanting one place a place each, and says they share a name", () => {
    const draft = draftOf([
      scout("1", { patrol: "Patrull 2" }),
      scout("2", { patrol: "patrull 2" }),
    ])

    expect(draft.placements.get("1")).not.toBe(draft.placements.get("2"))
    expect(sharedNames(draft)).toHaveLength(1)
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
    expect(patrolName(draft, 2), "the place's own name").toBe(placeName(2))
    expect(patrolName(renamed(draft, 2, " Ugglorna "), 2), "trimmed").toBe("Ugglorna")
  })

  it("moves a person into a patrol, between two, and out again", () => {
    let draft = moved(draftOf(unit), "3", 2)
    expect(membersOf(unit, draft, 2).map((person) => person.memberNo)).toEqual(["3"])

    draft = moved(draft, "3", 0)
    expect(membersOf(unit, draft, 0).map((person) => person.memberNo)).toEqual(["2", "3"])

    draft = moved(draft, "3", undefined)
    expect(membersOf(unit, draft, undefined).map((person) => person.memberNo)).toEqual(["3"])
  })

  it("moves several people together", () => {
    const draft = movedAll(draftOf(unit), ["1", "3"], 3)

    expect(membersOf(unit, draft, 3).map((person) => person.memberNo)).toEqual(["1", "3"])
  })

  it("never counts anybody but the unit's scouts among the unplaced", () => {
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

    expect(patrolWrites(unit, draft)).toEqual([{ memberNo: "2", patrol: "Örnarna" }])
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

describe("carrying a draft over what somebody else saved", () => {
  const stored = [scout("1", { patrol: "Falkarna" }), scout("2"), scout("3")]

  /**
   * The stored list with one scout's patrol changed behind the leader's back.
   */
  function storedWith(memberNo: string, patrol: string): readonly Participant[] {
    return stored.map((person) => (person.memberNo === memberNo ? { ...person, patrol } : person))
  }

  it("writes nobody the leader never touched", () => {
    const draft = moved(draftOf(stored), "2", 0)
    const people = storedWith("3", "Falkarna")

    const next = rebased(draft, stored, people)

    expect(patrolWrites(people, next)).toEqual([{ memberNo: "2", patrol: "Falkarna" }])
    expect(next.placements.get("3")).toBe(0)
  })

  it("opens a place for a patrol somebody else started", () => {
    const people = storedWith("3", "Ugglorna")

    const next = rebased(moved(draftOf(stored), "2", 0), stored, people)

    expect(patrolNames(next)).toContain("Ugglorna")
    expect(patrolWrites(people, next).map((write) => write.memberNo)).toEqual(["2"])
  })

  it("follows a scout somebody else took out of their patrol", () => {
    const people = stored.map((person) => scout(person.memberNo))

    const next = rebased(moved(draftOf(stored), "2", 0), stored, people)

    expect(next.placements.has("1")).toBe(false)
    expect(patrolWrites(people, next).map((write) => write.memberNo)).toEqual(["2"])
  })

  it("lets the leader's own move stand", () => {
    const people = storedWith("2", "Ugglorna")

    const next = rebased(moved(draftOf(stored), "2", 0), stored, people)

    expect(patrolWrites(people, next)).toEqual([{ memberNo: "2", patrol: "Falkarna" }])
  })

  it("adds a place past the last when none is free", () => {
    const named = { ...draftOf(stored), names: ["Falkarna", "B", "C", "D"] }
    const full = moved(named, "2", 1)
    const people = storedWith("3", "E")

    expect(patrolNames(rebased(full, stored, people))).toEqual(["Falkarna", "B", "C", "D", "E"])
  })
})

describe("a ledare's own patrol answer", () => {
  it("never asks for a write, whatever the draft does around it", () => {
    const draft = moved(renamed(draftOf(unit), 0, "Örnarna"), "4", 1)

    expect(patrolWrites(unit, draft).map((write) => write.memberNo)).not.toContain("4")
  })
})

describe("weighing a patrol", () => {
  it("counts the scouts and their genders", () => {
    const members = [
      scout("1", { gender: "kvinna" }),
      scout("2", { gender: "kvinna" }),
      scout("3", { gender: "man" }),
    ]

    const stats = patrolStats(members)

    expect(stats.scouts).toBe(3)
    expect(stats.genders).toEqual(
      new Map([
        ["kvinna", 2],
        ["man", 1],
      ]),
    )
  })

  it("leaves out a gender nobody in the patrol has", () => {
    expect(patrolStats([scout("1")]).genders.size).toBe(0)
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
  // The day the jamboree opens, so the scouts' ages do not move with the day the test runs.
  const today = new Date("2027-07-30")
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
    const draft = dealtOut(people, draftOf(people), today, fixed)

    expect([0, 1, 2, 3].map((index) => membersOf(scouts, draft, index).length)).toEqual([
      9, 9, 9, 9,
    ])
    expect(draft.placements.has("L")).toBe(false)
  })

  it("mixes genders and kårer rather than clumping them", () => {
    const draft = dealtOut(people, draftOf(people), today, fixed)

    for (const index of [0, 1, 2, 3]) {
      const members = membersOf(scouts, draft, index)
      const stats = patrolStats(members)
      expect(stats.genders.get("kvinna") ?? 0).toBeGreaterThanOrEqual(4)
      expect(new Set(members.map((member) => member.memberGroup)).size).toBe(3)
    }
  })

  it("deals to every patrol the unit has, past four", () => {
    const names = ["A", "B", "C", "D", "E"]
    const named = names.map((patrol, index) => scout(`N${String(index)}`, { patrol }))
    const unit = [...named, ...scouts]

    const draft = dealtOut(unit, draftOf(unit), today, fixed)

    expect(names.map((_, index) => membersOf(unit, draft, index).length)).toEqual([9, 8, 8, 8, 8])
  })

  it("places only the unplaced, leaving the rest where they were", () => {
    const start = moved(moved(draftOf(people), "0", 3), "1", 3)
    const draft = dealtOut(people, start, today, fixed)

    expect(draft.placements.get("0")).toBe(3)
    expect(draft.placements.get("1")).toBe(3)
    expect(membersOf(scouts, draft, undefined)).toEqual([])
  })
})

describe("grouping a unit by patrol", () => {
  it("gives a section per patrol and the scouts in none last, with no leader in any", () => {
    const sections = patrolSections(unit)

    expect(sections.map((section) => section.label)).toEqual([
      "Falkarna",
      "Vargarna",
      "Utan patrull",
    ])
    expect(sections[0]?.people.map((person) => person.memberNo)).toEqual(["2"])
    expect(sections[2]?.people.map((person) => person.memberNo)).toEqual(["3"])
  })

  it("sorts the sections by name wherever the patrols stand", () => {
    const sections = patrolSections([
      scout("1", { patrol: "Patrull 1" }),
      scout("2", { patrol: "Falkarna" }),
    ])

    expect(sections.map((section) => section.label)).toEqual(["Falkarna", "Patrull 1"])
  })

  it("tells a patrol from the scouts in none when it shares their heading", () => {
    const sections = patrolSections([scout("1", { patrol: "Utan patrull" }), scout("2")])

    expect(sections.map((section) => section.label)).toEqual(["Utan patrull", "Utan patrull"])
    expect(new Set(sections.map((section) => section.id)).size).toBe(2)
  })

  it("gives nothing for a unit nobody has divided", () => {
    expect(patrolSections([scout("1"), scout("2")])).toEqual([])
  })
})
