/**
 * Where the web application is running, answered once and never again.
 *
 * The fact this reads – the webview's User-Agent – is fixed before the document is
 * requested, so the answer is available synchronously at module evaluation, before React
 * renders anything. There is no message to wait for, and therefore no frame in which the
 * wrong chrome is on screen.
 */

/**
 * The place the web application runs in – an ordinary browser, or a webview inside a
 * native shell.
 */
export type Tier = "browser" | "shell"

/**
 * Which shell hosts the web application, because the two carry the bridge differently.
 */
export type ShellPlatform = "android" | "ios"

/**
 * The host as the User-Agent describes it.
 */
export interface Host {
  /**
   * The shell's platform, or undefined in a browser and in a shell that did not name one.
   */
  readonly platform: ShellPlatform | undefined
  readonly tier: Tier
}

/**
 * What the shells append to the webview's User-Agent to announce themselves, followed by
 * the bridge version and the platform – `CampfireShell/1 (ios)`.
 */
const shellToken = "CampfireShell"
const platformToken = /\bCampfireShell\/\d+ \((android|ios)\)/u

/**
 * Reads the host off the User-Agent. Node and a worker may have no `navigator`, so an
 * absent one is the browser tier rather than a crash at import time.
 *
 * @returns The host this document is running in.
 */
function detectHost(): Host {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent
  if (!userAgent.includes(shellToken)) {
    return { platform: undefined, tier: "browser" }
  }
  const platform = platformToken.exec(userAgent)?.[1]
  return {
    platform: platform === "android" || platform === "ios" ? platform : undefined,
    tier: "shell",
  }
}

/**
 * The host, frozen at module evaluation so every reader sees the same answer and no two
 * components can disagree about it.
 */
export const host: Host = Object.freeze(detectHost())
