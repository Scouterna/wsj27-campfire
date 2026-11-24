import { describe, expect, it } from "vitest"

import type { Participant } from "./Participant"
import { picturesName, withheldPictures } from "./pictures"
import { unitNumbered } from "./Unit"

/**
 * A deltagare in a unit, with whatever they answered about pictures.
 * @param name The first name, which also orders them.
 * @param unitNumber The unit they are in.
 * @param canPublish Their answer, left out where it was not sent.
 * @returns The person.
 */
function scout(name: string, unitNumber: number, canPublish?: boolean): Participant {
  return {
    firstName: name,
    lastName: "Lind",
    memberNo: name,
    role: "deltagare",
    unit: unitNumbered(unitNumber),
    ...(canPublish !== undefined && { picturesPublishable: canPublish }),
  }
}

describe("saying whether pictures may be published", () => {
  it("says a yes and a no in the profile's words", () => {
    expect(picturesName(true)).toBe("Får publiceras")
    expect(picturesName(false)).toBe("Får inte publiceras")
  })
})

describe("finding who in a unit said no to pictures", () => {
  it("keeps only the no-sayers of the unit asked about, in reading order", () => {
    const people = [
      scout("Örjan", 1, false),
      scout("Alva", 1, false),
      scout("Bo", 1, true),
      scout("Cleo", 1),
      scout("Dan", 2, false),
    ]

    expect(withheldPictures(people, 1).map((person) => person.firstName)).toEqual(["Alva", "Örjan"])
  })

  it("finds nobody in a unit where nobody the reader can see said no", () => {
    expect(withheldPictures([scout("Bo", 1, true), scout("Cleo", 1)], 1)).toEqual([])
  })
})
