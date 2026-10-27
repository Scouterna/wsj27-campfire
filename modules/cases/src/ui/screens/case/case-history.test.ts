import { describe, expect, it } from "vitest"

import type { Case } from "../../../model/Case"
import type { Note } from "../../../model/Note"
import type { Person } from "../../../model/Person"
import { historyOf } from "./case-history"

const people = new Map<string, Person>([
  [
    "1200001",
    {
      funktion: "Hälsosupport",
      memberNo: "1200001",
      name: "Helena Hägg",
      role: "kontingentledning",
    },
  ],
  ["1200401", { memberNo: "1200401", name: "Karin Kron", role: "kontingentledning" }],
  ["1300035", { memberNo: "1300035", name: "Ester Dahl", role: "deltagare", troop: "1" }],
  ["1300049", { memberNo: "1300049", name: "Ivar Forsberg", role: "deltagare", troop: "1" }],
])

const opened: Case = {
  aboutMemberNos: ["1300035"],
  createdAt: new Date(2027, 7, 1, 8),
  creatorMemberNo: "1200001",
  extraAccess: [],
  id: "1",
  isClosed: false,
  secrecyLevel: 3,
  title: "Feber",
  troop: "1",
  type: "hälsa",
}

const written: Note = {
  attachments: [],
  authorMemberNo: "1200001",
  caseId: "1",
  createdAt: new Date(2027, 7, 1, 9),
  id: "10",
  secrecyLevel: 3,
  text: "Feber 38,5 i kväll.",
  title: "Feber",
}

describe("the history of a case", () => {
  it("orders the notes, the opening, and the closing newest first", () => {
    const closed: Case = {
      ...opened,
      closedAt: new Date(2027, 7, 2, 12),
      closedByMemberNo: "1200401",
      isClosed: true,
    }
    const later: Note = { ...written, createdAt: new Date(2027, 7, 1, 20), id: "11" }

    const history = historyOf(closed, [written, later], people, undefined)

    expect(history.map((entry) => entry.key)).toEqual(["closed", "note-11", "note-10", "created"])
    expect(history.map((entry) => entry.isEvent)).toEqual([true, false, false, true])
  })

  it("tells who opened and who closed the case, by name", () => {
    const closed: Case = {
      ...opened,
      closedAt: new Date(2027, 7, 2),
      closedByMemberNo: "1200401",
      isClosed: true,
    }

    const [closing, , creation] = historyOf(closed, [written], people, undefined)

    expect(creation).toMatchObject({
      body: "Helena Hägg skapade ärendet.",
      title: "Ärendet skapades",
    })
    expect(closing).toMatchObject({
      body: "Karin Kron avslutade ärendet.",
      title: "Ärendet avslutades",
    })
  })

  it("says someone closed the case when nobody is recorded", () => {
    const closed: Case = { ...opened, closedAt: new Date(2027, 7, 2), isClosed: true }

    expect(historyOf(closed, [], people, undefined)[0]?.body).toBe("Någon avslutade ärendet.")
  })

  it("drops the closing of a case that is open again", () => {
    const reopened: Case = { ...opened, closedAt: new Date(2027, 7, 2), isClosed: false }

    expect(historyOf(reopened, [], people, undefined).map((entry) => entry.key)).toEqual([
      "created",
    ])
  })

  it("names a note's author, marks the reader's own, and places them", () => {
    const [own] = historyOf(opened, [written], people, "1200001")
    const [other] = historyOf(opened, [written], people, "1200401")

    expect(own).toMatchObject({
      body: "Feber 38,5 i kväll.",
      subtitle: "CMT · Hälsosupport",
      title: "Helena Hägg (du)",
    })
    expect(other?.title).toBe("Helena Hägg")
  })

  it("falls back to the member number while the names are loading", () => {
    const [note, creation] = historyOf(opened, [written], undefined, undefined)

    expect(note).toMatchObject({ title: "Medlem 1200001" })
    expect(note).not.toHaveProperty("subtitle")
    expect(creation?.body).toBe("Medlem 1200001 skapade ärendet.")
  })

  it("marks only a note more secret than its case, and carries only pictures it has", () => {
    const picture = { height: 1, id: "7", picture: "/p", thumbnail: "/t", width: 1 }
    const secret: Note = { ...written, attachments: [picture], secrecyLevel: 5 }

    const [plain] = historyOf(opened, [written], people, undefined)
    const [marked] = historyOf(opened, [secret], people, undefined)

    expect(plain).not.toHaveProperty("audience")
    expect(plain).not.toHaveProperty("pictures")
    expect(marked).toMatchObject({ audience: "Bara du", pictures: [picture] })
  })

  it("tells a change of who the case is about as an event, naming each side", () => {
    const both: Note = {
      ...written,
      authorMemberNo: "1200401",
      id: "12",
      peopleChange: { added: ["1300035", "1300049"], removed: ["1200001"] },
      text: "Added: 1300035, 1300049\nRemoved: 1200001",
    }
    const addedOnly: Note = { ...both, peopleChange: { added: ["1300049"], removed: [] } }

    const [change] = historyOf(opened, [both], people, undefined)
    const [addition] = historyOf(opened, [addedOnly], people, undefined)

    expect(change).toMatchObject({
      body: "Karin Kron lade till Ester Dahl och Ivar Forsberg och tog bort Helena Hägg.",
      isEvent: true,
      key: "note-12",
      title: "Vem ärendet gäller ändrades",
    })
    expect(addition?.body).toBe("Karin Kron lade till Ivar Forsberg.")
  })
})
