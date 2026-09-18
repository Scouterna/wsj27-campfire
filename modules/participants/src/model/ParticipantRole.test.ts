import { describe, expect, it } from "vitest"

import { roleName, roleOrder } from "./ParticipantRole"

describe("naming a role", () => {
  it("gives the word a row shows, singular", () => {
    expect(roleName("deltagare")).toBe("Deltagare")
    expect(roleName("ist")).toBe("IST")
    expect(roleName("ledare")).toBe("Ledare")
    expect(roleName("kontingentledning")).toBe("CMT")
  })
})

describe("the order roles are read in", () => {
  it("puts responsibility before attendance", () => {
    expect(roleOrder).toEqual(["kontingentledning", "ledare", "ist", "deltagare"])
  })
})
