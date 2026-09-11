import { describe, expect, it } from "vitest"

import { ParticipantsScreen } from "./index"

describe("the participants module's public surface", () => {
  it("exports the screen the application mounts", () => {
    expect(ParticipantsScreen).toBeTypeOf("function")
  })
})
