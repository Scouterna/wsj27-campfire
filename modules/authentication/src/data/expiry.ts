import { askAgain } from "./session"

/**
 * How long past the expiry a cookie may still read as past before the watcher asks. The
 * service's keep-alive script refreshes ten seconds before expiry, so a cookie still
 * past at expiry plus this means the script failed or stalled – and it is also the
 * shortest time between two asks, so a cookie an ask could not renew never becomes a
 * tight loop.
 */
const grace = 20_000

/**
 * The longest delay `setTimeout` holds. A longer one fires at once, so an expiry far in
 * the future would otherwise spin the watcher.
 */
const longestDelay = 2_147_483_647

/**
 * The access token's expiry cookie, set on every sign-in and refresh with the token's
 * own Max-Age, so the browser drops it at expiry.
 */
const pattern = /(?:^| )wsj27-auth_expires-at=([^;]+)/

/**
 * The auth service's cookie for when the refresh window closes, set with the refresh
 * token's own Max-Age, so while the browser holds it, a session can be refreshed.
 */
const refreshPattern = /(?:^| )wsj27-auth_refresh-expires-at=[^;]/

/**
 * The expiry the cookie header carries – the same cookie, found the same way, as the
 * service's own refresh script reads it.
 * @param cookie A `document.cookie` string.
 * @returns The expiry in epoch milliseconds, or undefined when absent or not a number.
 */
export function readExpiry(cookie: string): number | undefined {
  const value = pattern.exec(cookie)?.[1]
  if (value === undefined) {
    return undefined
  }
  const expiresAt = Number(value)
  return Number.isSafeInteger(expiresAt) ? expiresAt : undefined
}

/**
 * Whether the cookie header carries the refresh window's cookie. Only its presence is
 * read, never the time inside it, because the browser drops the cookie when the window
 * closes and a phone's clock may be set wrong.
 * @param cookie A `document.cookie` string.
 * @returns True when the cookie is present with a value.
 */
export function hasRefreshWindow(cookie: string): boolean {
  return refreshPattern.test(cookie)
}

/**
 * Watches the expiry cookie while the session lives. Asks again when the expiry has
 * passed and the cookie was not renewed, or when it is absent, and checks at once when
 * the page becomes visible. It only asks – what the answer means is for the store and
 * the gate to decide.
 * @returns The stop function, after which nothing is scheduled and nothing is asked.
 */
export function watchExpiry(): () => void {
  let lastAsk: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const schedule = (at: number): void => {
    const delay = Math.max(0, at - Date.now())
    clearTimeout(timer)
    timer = setTimeout(check, Math.min(delay, longestDelay))
  }

  function check(): void {
    const now = Date.now()
    const expiresAt = readExpiry(document.cookie)
    if (expiresAt !== undefined && expiresAt > now) {
      schedule(expiresAt + grace)
      return
    }
    // The timer and a visibility change can both land inside one grace; only the first asks.
    if (lastAsk === undefined || now - lastAsk >= grace) {
      lastAsk = now
      void askAgain()
    }
    schedule(lastAsk + grace)
  }

  const onVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      check()
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange)
  check()

  return () => {
    clearTimeout(timer)
    document.removeEventListener("visibilitychange", onVisibilityChange)
  }
}
