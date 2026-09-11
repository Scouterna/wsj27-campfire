import { describe, expect, it } from "vitest"

import { SignInScreen } from "./index"

describe("the authentication module's public surface", () => {
  it("exports the screen the application mounts", () => {
    expect(SignInScreen).toBeTypeOf("function")
  })
})
