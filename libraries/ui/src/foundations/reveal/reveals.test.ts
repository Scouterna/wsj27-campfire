import { afterEach, describe, expect, it, vi } from "vitest"

import { isRevealBypassed, reveals } from "./reveals"

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A storage answering with exactly what a test stores.
 */
function storageWith(value: string | undefined): void {
  vi.stubGlobal("localStorage", {
    // eslint-disable-next-line unicorn/no-null -- the platform's getItem contract is null for a miss
    getItem: () => value ?? null,
  })
}

describe("whether a reveal is bypassed", () => {
  it("opens the reveals the stored array lists, and no others", () => {
    storageWith(JSON.stringify(["units"]))

    expect(isRevealBypassed("units")).toBe(true)
    expect(isRevealBypassed("something-later")).toBe(false)
  })

  it("reads nothing stored as no bypass", () => {
    storageWith(undefined)

    expect(isRevealBypassed("units")).toBe(false)
  })

  it("reads anything that is not a JSON array of ids as no bypass", () => {
    for (const junk of ["open", "units", '{"units":true}', "[1,2]"]) {
      storageWith(junk)
      expect(isRevealBypassed("units")).toBe(false)
    }
  })

  it("reads a storage that throws as no bypass", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("locked down")
      },
    })

    expect(isRevealBypassed("units")).toBe(false)
  })
})

describe("the catalog", () => {
  it("gives every reveal an id of its own", () => {
    const ids = reveals.map((reveal) => reveal.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
