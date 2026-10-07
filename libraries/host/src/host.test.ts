import { afterEach, describe, expect, it, vi } from "vitest"

import type { Host } from "./index"

const plainAgent = "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15"
const shellAgent = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CampfireShell/1 (ios)"

/**
 * Re-evaluates the package, because the tier is computed once at module evaluation and
 * frozen. Every case therefore stubs the global first and loads second.
 *
 * @returns The host the freshly evaluated module settled on.
 */
async function loadHost(): Promise<Host> {
  vi.resetModules()
  const module = await import("./index")
  return module.host
}

/**
 * The tier alone, for the cases that ask nothing else.
 *
 * @returns The tier the freshly evaluated module settled on.
 */
async function loadTier(): Promise<Host["tier"]> {
  const loaded = await loadHost()
  return loaded.tier
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

  it("names the platform the shell announced", async () => {
    vi.stubGlobal("navigator", { userAgent: shellAgent })

    await expect(loadHost()).resolves.toEqual({ platform: "ios", tier: "shell" })
  })

  it("is still the shell tier when the platform is missing", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 CampfireShell" })

    await expect(loadHost()).resolves.toEqual({ platform: undefined, tier: "shell" })
  })
})
