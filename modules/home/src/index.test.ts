import { describe, expect, it } from "vitest"

import { HomeScreen } from "./index"

describe("the home module's public surface", () => {
  it("exports the screen the application mounts", () => {
    expect(HomeScreen).toBeTypeOf("function")
  })
})
