/**
 * Spelled-out ways of naming a unit by its number – "avd 7", "avdelning 7".
 */
const numberedUnit = /^(?:avd(?:elning)?\.?\s*)?(\d+)$/u

/**
 * The units a search names: by number only the unit with exactly that number, so "1"
 * never reaches 11, and by name every unit whose name holds the search.
 * @param units The units to search, in the order to keep.
 * @param needle What the reader typed, trimmed and lower-cased.
 * @param nameOf What a unit is called, or undefined for one the contingent has not named.
 * @returns The units named, in the order given – none while nothing is typed.
 */
export function matchingUnits(
  units: readonly number[],
  needle: string,
  nameOf: (unitNumber: number) => string | undefined,
): readonly number[] {
  if (needle === "") {
    return []
  }
  const numbered = numberedUnit.exec(needle)?.[1]
  if (numbered !== undefined) {
    return units.filter((unit) => unit === Number(numbered))
  }
  return units.filter((unit) => nameOf(unit)?.toLocaleLowerCase("sv").includes(needle) === true)
}
