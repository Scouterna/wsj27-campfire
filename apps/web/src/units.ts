import type { UnitIdentities } from "@scouterna/wsj27-campfire-ui"

/**
 * Loads the units' identities – their names, and where their glyphs are served –
 * from the manifest in `assets/units/`. The identities are runtime data rather than
 * code, so a manifest that is missing or unreadable costs the names and nothing
 * else, and every consumer falls back to the number.
 * @returns The identities, knowing nothing when the manifest is absent or unreadable.
 */
export async function loadUnitIdentities(): Promise<UnitIdentities> {
  try {
    const response = await fetch("/units/units.json")
    if (!response.ok) {
      return unknownIdentities
    }
    const parsed: unknown = await response.json()
    const names = new Map<number, string>()
    if (typeof parsed === "object" && parsed !== null) {
      for (const [key, value] of Object.entries(parsed)) {
        const unitNumber = Number(key)
        if (Number.isSafeInteger(unitNumber) && typeof value === "string" && value !== "") {
          names.set(unitNumber, value)
        }
      }
    }
    return {
      // A glyph is served exactly for the units the manifest names, so a unit the
      // manifest skips never becomes a broken image.
      glyphSrc: (unitNumber) =>
        names.has(unitNumber) ? `/units/${String(unitNumber)}.svg` : undefined,
      name: (unitNumber) => names.get(unitNumber),
    }
  } catch {
    return unknownIdentities
  }
}

/**
 * The identities when nothing could be loaded – every lookup answers undefined, and
 * the avatars wear their numbers.
 */
const unknownIdentities: UnitIdentities = {
  glyphSrc: () => {
    // Nothing is known.
  },
  name: () => {
    // Nothing is known.
  },
}
