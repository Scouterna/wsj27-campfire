/**
 * The reveals: the moments parts of the product become visible. A foundation like the
 * themes – Campfire's own facts, kept here so anything in the product can gate by a
 * reveal's id with nothing but the design system in hand. The provider beside this
 * hangs them; what an id gates is each consumer's business.
 */

/**
 * One curtain: something in the product that stays hidden until its moment.
 */
export interface Reveal {
  /**
   * The moment this reveal opens. Written with its offset so the moment is the same
   * wherever the clock reading it happens to stand.
   */
  readonly at: Date
  /**
   * The promise under a countdown's clock – what the moment brings.
   */
  readonly hint: string
  /**
   * The name consumers gate by, such as "units".
   */
  readonly id: string
  /**
   * The line over a countdown's clock naming the moment, in words matching `at`.
   */
  readonly overline: string
}

/**
 * The units reveal, the evening the application opens and the leaders meet their
 * avdelningar.
 */
export const unitsReveal: Reveal = {
  at: new Date("2026-09-19T19:30:00+02:00"),
  hint: "Då öppnar appen – avdelningarna avslöjas och du får se din avdelning.",
  id: "units",
  overline: "Lördag 19 september 19.30",
}

/**
 * Every reveal in the product. The application hangs exactly this list, so a new reveal
 * is another entry here rather than another mechanism.
 */
export const reveals: readonly Reveal[] = [unitsReveal]

/**
 * The localStorage key that opens reveals early, for development. The value is a JSON
 * array of reveal ids: `localStorage.setItem("campfire-reveal", '["units"]')` in the
 * console, and those curtains are open on this browser. Anything that is not such an
 * array opens nothing.
 */
const bypassKey = "campfire-reveal"

/**
 * Whether one reveal is bypassed on this browser. Guarded, because storage can be
 * absent (a test's Node environment), refuse to answer (a locked-down webview), or
 * hold something that is not the JSON array it should – each reads as no bypass
 * rather than a crash. A consumer asks the provider, which folds the bypass in.
 * @param id The reveal's id.
 * @returns True when the development bypass lists it.
 */
export function isRevealBypassed(id: string): boolean {
  try {
    const stored = localStorage.getItem(bypassKey)
    if (stored === null) {
      return false
    }
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.includes(id)
  } catch {
    return false
  }
}

// setTimeout's delay is a signed 32-bit count of milliseconds, so a longer wait overflows
// and fires at once. A far-off moment sleeps a day at a time instead.
const day = 24 * 60 * 60 * 1000

/**
 * Calls back once when a reveal's moment has passed – a beat past it, so a clock read on
 * waking is unambiguously beyond. A moment already passed calls back after that beat.
 * @param reveal The reveal to wake for.
 * @param onOpen Called when the moment has passed, and never after cancelling.
 * @returns Cancels the wake, whichever of its timers is pending.
 */
export function wakeAt(reveal: Reveal, onOpen: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>

  const arm = (): void => {
    const wait = Math.max(0, reveal.at.getTime() - Date.now()) + 50
    timer = wait > day ? setTimeout(arm, day) : setTimeout(onOpen, wait)
  }
  arm()

  return () => {
    clearTimeout(timer)
  }
}
