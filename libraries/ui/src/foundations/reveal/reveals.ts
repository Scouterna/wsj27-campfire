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
   * The name consumers gate by – "units", and whatever is revealed after it.
   */
  readonly id: string
  /**
   * The line over a countdown's clock naming the moment, in words matching `at`.
   */
  readonly overline: string
}

/**
 * The units reveal: 19 September 2026 at 19.30, Swedish time – the evening the
 * application opens and the leaders meet their avdelningar.
 */
export const unitsReveal: Reveal = {
  at: new Date("2026-09-19T19:30:00+02:00"),
  hint: "Då öppnar appen – avdelningarna avslöjas och du får se din avdelning.",
  id: "units",
  overline: "Lördag 19 september 19.30",
}

/**
 * Every reveal the product currently has. The application hangs exactly this list,
 * and the next reveal is another entry here, not another mechanism.
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
 * rather than a crash. Internal to the reveal machinery: consumers ask the provider,
 * which folds the bypass in.
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
