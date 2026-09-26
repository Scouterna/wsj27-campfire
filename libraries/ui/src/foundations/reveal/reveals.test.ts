import { afterEach, describe, expect, it, vi } from "vitest"

import { isRevealBypassed, type Reveal, reveals, wakeAt } from "./reveals"

afterEach(() => {
  vi.useRealTimers()
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

describe("waking at a reveal's moment", () => {
  const day = 24 * 60 * 60 * 1000
  const now = new Date("2026-06-01T12:00:00Z")

  /**
   * A reveal the given number of days from the frozen now.
   */
  function revealIn(days: number): Reveal {
    return { at: new Date(now.getTime() + days * day), hint: "", id: "later", overline: "" }
  }

  it("opens a far-off reveal once, at its moment", () => {
    vi.useFakeTimers({ now })
    const onOpen = vi.fn()

    wakeAt(revealIn(30), onOpen)

    vi.advanceTimersByTime(30 * day - 1)
    expect(onOpen).not.toHaveBeenCalled()
    vi.advanceTimersByTime(day)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("never opens once cancelled, even after re-arming past the first day", () => {
    vi.useFakeTimers({ now })
    const onOpen = vi.fn()

    const cancel = wakeAt(revealIn(30), onOpen)
    vi.advanceTimersByTime(2 * day)
    cancel()
    vi.advanceTimersByTime(40 * day)

    expect(onOpen).not.toHaveBeenCalled()
  })

  it("opens a reveal already due after a beat", () => {
    vi.useFakeTimers({ now })
    const onOpen = vi.fn()

    wakeAt(revealIn(-1), onOpen)

    expect(onOpen).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
