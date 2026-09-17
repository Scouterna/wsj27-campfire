import { describe, expect, it } from "vitest"

import { participantsSectionLabel } from "./ParticipantsScreen"

describe("what the participants section is called", () => {
  it("names a leader's section their own unit", () => {
    expect(participantsSectionLabel([{ kind: "leader", unitNumber: 1 }])).toBe("Min avdelning")
  })

  it("names it Deltagare for the administration function", () => {
    expect(participantsSectionLabel([{ kind: "cmt" }, { kind: "admin" }])).toBe("Deltagare")
  })

  it("lets the leader's name win when the roles carry both", () => {
    expect(participantsSectionLabel([{ kind: "leader" }, { kind: "cmt" }, { kind: "admin" }])).toBe(
      "Min avdelning",
    )
  })
})
