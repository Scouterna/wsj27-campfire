/**
 * Where the web application is running, answered once and never again.
 *
 * The fact this reads – the webview's User-Agent – is fixed before the document is
 * requested, so the answer is available synchronously at module evaluation, before React
 * renders anything. There is no message to wait for, and therefore no frame in which the
 * wrong chrome is on screen.
 */

/**
 * Which of the two tiers the web application is running in: an ordinary browser, or a
 * webview inside one of the native shells.
 */
export type Tier = "browser" | "shell"

/**
 * What the shells append to the webview's User-Agent to announce themselves.
 */
const shellToken = "CampfireShell"

/**
 * Reads the tier off the User-Agent. Node has no `navigator` on every version this runs
 * on, and neither does a worker, so an absent one is the browser tier rather than a
 * crash at import time.
 *
 * @returns The tier this document is running in.
 */
function detectTier(): Tier {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent
  return userAgent.includes(shellToken) ? "shell" : "browser"
}

/**
 * The host, frozen at module evaluation. Frozen because every reader must see the same
 * answer: a tier that could be reassigned is a tier two components could disagree about.
 */
export const host: { readonly tier: Tier } = Object.freeze({ tier: detectTier() })
