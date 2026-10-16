// The units' names, which are the contingent's own and never change.
const unitNames: ReadonlyMap<number, string> = new Map([
  [1, "Björnen"],
  [2, "Bävern"],
  [3, "Ekorren"],
  [4, "Fladdermusen"],
  [5, "Räven"],
  [6, "Geten"],
  [7, "Vildsvinet"],
  [8, "Haren"],
  [9, "Igelkotten"],
  [10, "Lodjuret"],
  [11, "Kräftan"],
  [12, "Musen"],
  [13, "Renen"],
  [14, "Rådjuret"],
  [15, "Fåret"],
  [16, "Kråkan"],
  [17, "Uttern"],
  [18, "Vargen"],
  [19, "Ormen"],
  [20, "Ankan"],
  [21, "Gräshoppan"],
  [22, "Gåsen"],
  [23, "Hönan"],
  [24, "Sälen"],
  [25, "Svanen"],
  [26, "Hästen"],
  [27, "Getingen"],
  [28, "Myran"],
  [29, "Ugglan"],
  [30, "Abborren"],
  [31, "Laxen"],
  [32, "Maneten"],
  [33, "Vesslan"],
  [34, "Räkan"],
  [35, "Hajen"],
  [36, "Sparven"],
  [37, "Ödlan"],
  [38, "Grodan"],
  [39, "Humlan"],
  [40, "Fjärilen"],
  [41, "Tranan"],
  [42, "Nyckelpigan"],
  [43, "Örnen"],
  [44, "Krabban"],
  [45, "Mullvaden"],
  [46, "Kon"],
  [47, "Trollsländan"],
  [48, "Spindeln"],
  [49, "Myskoxen"],
  [50, "Hjorten"],
  [51, "Strömmingen"],
  [52, "Korpen"],
  [53, "Staren"],
])

/**
 * Every unit the contingent has named, by number, in order. The IST's and the
 * management's slots are not among them.
 */
export const unitNumbers: readonly number[] = unitNames
  .keys()
  .toArray()
  .toSorted((left, right) => left - right)

/**
 * What a unit is called – "Björnen". Which animal a unit wears is a surprise until the
 * units reveal opens, and holding the name back until then is each caller's business.
 * @param unitNumber The unit's number.
 * @returns The name, or undefined for a number the contingent has not named – the IST's
 *   and the management's slots among them.
 */
export function unitName(unitNumber: number): string | undefined {
  return unitNames.get(unitNumber)
}
