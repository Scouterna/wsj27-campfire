import { afterEach, describe, expect, it, vi } from "vitest"

import type { Tier } from "./index"

const plainAgent = "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15"
const shellAgent = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CampfireShell/1 (ios)"

/**
 * Re-evaluates the package, because the tier is computed once at module evaluation and
 * frozen. Every case therefore stubs the global first and loads second.
 *
 * @returns The tier the freshly evaluated module settled on.
 */
async function loadTier(): Promise<Tier> {
  vi.resetModules()
  const module = await import("./index")
  return module.host.tier
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the tier", () => {
  it("is the browser tier for an ordinary browser", async () => {
    vi.stubGlobal("navigator", { userAgent: plainAgent })

    await expect(loadTier()).resolves.toBe("browser")
  })

  it("is the shell tier when a shell announced itself in the User-Agent", async () => {
    vi.stubGlobal("navigator", { userAgent: shellAgent })

    await expect(loadTier()).resolves.toBe("shell")
  })

  it("is the browser tier where there is no navigator at all", async () => {
    vi.stubGlobal("navigator", undefined)

    await expect(loadTier()).resolves.toBe("browser")
  })
})
