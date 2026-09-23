import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { hasRefreshWindow, readExpiry, watchExpiry } from "./expiry"
import { askAgain } from "./session"

vi.mock("./session", () => ({
  askAgain: vi.fn(() => Promise.resolve({ kind: "unreachable" })),
}))

/**
 * The moment every timer test starts at.
 */
const start = Date.UTC(2027, 6, 30, 12)

/**
 * The watcher's grace, as the tests expect it.
 */
const grace = 20_000

/**
 * A stand-in for the page's document: its cookie, its visibility, and its one listener.
 */
interface Page {
  cookie: string
  listener: (() => void) | undefined
  visibilityState: "hidden" | "visible"
}

/**
 * Stands in for the platform's `document` with a mutable cookie and visibility, recording
 * the listener the watcher adds so a test can fire it.
 * @param cookie The cookie header the page starts with.
 * @returns The page, which the test changes in place.
 */
function pageWith(cookie: string): Page {
  const page: Page = { cookie, listener: undefined, visibilityState: "visible" }
  vi.stubGlobal("document", {
    addEventListener: (_type: string, listener: () => void) => {
      page.listener = listener
    },
    get cookie() {
      return page.cookie
    },
    removeEventListener: (_type: string, listener: () => void) => {
      if (page.listener === listener) {
        page.listener = undefined
      }
    },
    get visibilityState() {
      return page.visibilityState
    },
  })
  return page
}

/**
 * The cookie header the auth service leaves after a sign-in or refresh.
 * @param expiresAt The expiry in epoch milliseconds.
 * @returns The header, with an unrelated cookie on either side.
 */
function expiringAt(expiresAt: number): string {
  return `theme=dark; wsj27-auth_expires-at=${String(expiresAt)}; lang=sv`
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(start)
})

afterEach(() => {
  vi.mocked(askAgain).mockClear()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("reading the expiry cookie", () => {
  it("reads the expiry among other cookies", () => {
    expect(readExpiry(expiringAt(start))).toBe(start)
  })

  it("reads the expiry when it is the only cookie", () => {
    expect(readExpiry(`wsj27-auth_expires-at=${String(start)}`)).toBe(start)
  })

  it("reads nothing when the cookie is absent", () => {
    expect(readExpiry("theme=dark; lang=sv")).toBeUndefined()
  })

  it("reads nothing from a cookie that is not a number", () => {
    expect(readExpiry("wsj27-auth_expires-at=soon")).toBeUndefined()
  })

  it("reads nothing from an empty value", () => {
    expect(readExpiry("wsj27-auth_expires-at=; lang=sv")).toBeUndefined()
  })

  it("reads nothing from a cookie whose name only ends the same way", () => {
    expect(readExpiry(`old-wsj27-auth_expires-at=${String(start)}`)).toBeUndefined()
  })

  it("reads nothing from the refresh window's cookie", () => {
    expect(readExpiry(`wsj27-auth_refresh-expires-at=${String(start)}`)).toBeUndefined()
  })
})

describe("reading the refresh window's cookie", () => {
  it("finds it among other cookies", () => {
    expect(hasRefreshWindow(`theme=dark; wsj27-auth_refresh-expires-at=${String(start)}`)).toBe(
      true,
    )
  })

  it("finds it when it is the only cookie", () => {
    expect(hasRefreshWindow(`wsj27-auth_refresh-expires-at=${String(start)}`)).toBe(true)
  })

  it("does not take the access token's expiry for it", () => {
    expect(hasRefreshWindow(expiringAt(start))).toBe(false)
  })

  it("does not find an empty value", () => {
    expect(hasRefreshWindow("wsj27-auth_refresh-expires-at=; lang=sv")).toBe(false)
  })

  it("does not find a cookie whose name only ends the same way", () => {
    expect(hasRefreshWindow(`old-wsj27-auth_refresh-expires-at=${String(start)}`)).toBe(false)
  })
})

describe("watching the expiry", () => {
  it("asks at the expiry plus grace and not one millisecond before", () => {
    const expiresAt = start + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    page.cookie = ""
    vi.advanceTimersByTime(expiresAt + grace - start - 1)
    expect(askAgain).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(askAgain).toHaveBeenCalledOnce()
    stop()
  })

  it("reschedules to the new expiry when the cookie was renewed before the timer fired", () => {
    const expiresAt = start + 300_000
    const renewedAt = expiresAt + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    page.cookie = expiringAt(renewedAt)
    vi.advanceTimersByTime(expiresAt + grace - start)
    expect(askAgain).not.toHaveBeenCalled()

    page.cookie = ""
    vi.advanceTimersByTime(renewedAt - expiresAt - 1)
    expect(askAgain).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(askAgain).toHaveBeenCalledOnce()
    stop()
  })

  it("asks at once when the cookie is absent at the start", () => {
    pageWith("theme=dark")
    const stop = watchExpiry()

    expect(askAgain).toHaveBeenCalledOnce()
    stop()
  })

  it("asks again a grace later while the cookie stays past", () => {
    pageWith(expiringAt(start - 1))
    const stop = watchExpiry()
    expect(askAgain).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(grace - 1)
    expect(askAgain).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(1)
    expect(askAgain).toHaveBeenCalledTimes(2)
    stop()
  })

  it("asks at once when the page becomes visible past the expiry", () => {
    const expiresAt = start + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    vi.setSystemTime(expiresAt + 1)
    page.listener?.()
    expect(askAgain).toHaveBeenCalledOnce()
    stop()
  })

  it("does not ask when the page is hidden, even past the expiry", () => {
    const expiresAt = start + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    vi.setSystemTime(expiresAt + 1)
    page.visibilityState = "hidden"
    page.listener?.()
    expect(askAgain).not.toHaveBeenCalled()
    stop()
  })

  it("does not ask when the page becomes visible before the expiry", () => {
    const page = pageWith(expiringAt(start + 300_000))
    const stop = watchExpiry()

    page.listener?.()
    expect(askAgain).not.toHaveBeenCalled()
    stop()
  })

  it("does not ask twice within grace when a visibility change and the timer both land", () => {
    const expiresAt = start + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    vi.advanceTimersByTime(expiresAt - start + grace - 5000)
    page.cookie = ""
    page.listener?.()
    expect(askAgain).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(grace - 1)
    expect(askAgain).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(1)
    expect(askAgain).toHaveBeenCalledTimes(2)
    stop()
  })

  it("does not ask twice within grace when the page becomes visible right after an ask", () => {
    const page = pageWith("")
    const stop = watchExpiry()
    expect(askAgain).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(grace - 1)
    page.listener?.()
    expect(askAgain).toHaveBeenCalledOnce()
    stop()
  })

  it("stops the timer and the listener, so nothing asks after it stops", () => {
    const expiresAt = start + 300_000
    const page = pageWith(expiringAt(expiresAt))
    const stop = watchExpiry()

    stop()
    page.cookie = ""
    expect(page.listener).toBeUndefined()
    vi.advanceTimersByTime(expiresAt - start + 10 * grace)
    expect(askAgain).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
