import { describe, expect, it } from "vitest"

import { JourneyScreen } from "./index"

describe("the journey module's public surface", () => {
  it("exports the screen the application mounts", () => {
    expect(JourneyScreen).toBeTypeOf("function")
  })
})
