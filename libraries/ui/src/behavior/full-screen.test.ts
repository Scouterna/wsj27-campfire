import { describe, expect, it, vi } from "vitest"

import { dismissFullScreen, whenScreenSettles } from "./full-screen"

describe("waiting for the screen to settle", () => {
  it("measures at once where no chrome listens, because nothing will move the viewport", () => {
    const onSettled = vi.fn()
    const cancel = whenScreenSettles(onSettled)
    expect(onSettled).toHaveBeenCalledOnce()
    // Cancelling what already ran is harmless.
    cancel()
    expect(onSettled).toHaveBeenCalledOnce()
  })
})

describe("dismissing full screen", () => {
  it("leaves back to the page when nothing fills the screen", () => {
    expect(dismissFullScreen()).toBe(false)
  })
})
