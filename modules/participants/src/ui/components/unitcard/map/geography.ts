import { packedPlaces } from "./places"

/**
 * One place on the map where somebody in the unit lives, and how many do.
 */
export interface Spot {
  /**
   * How many of the unit's people live there.
   */
  readonly count: number
  /**
   * Degrees north.
   */
  readonly latitude: number
  /**
   * Degrees east.
   */
  readonly longitude: number
  /**
   * The postort's own spelling – the key a spot is told apart by, never text on screen,
   * so no place is named because somebody in the unit lives there.
   */
  readonly name: string
}

// A home town as the service sends it may be upper case, padded, or double-spaced –
// "GÖTEBORG ", "Västra  Frölunda" – so both sides of the lookup are folded the same way.
const fold = (town: string): string => town.trim().replaceAll(/\s+/gu, " ").toLocaleLowerCase("sv")

type Place = readonly [name: string, longitude: number, latitude: number]

const cache: { index?: ReadonlyMap<string, Place> } = {}

/**
 * The postorter by folded name, unpacked on first use rather than at import, so a screen
 * that never draws a map never pays for the index.
 * @returns The index.
 */
function placeIndex(): ReadonlyMap<string, Place> {
  cache.index ??= new Map(
    packedPlaces.split(";").map((packed): [string, Place] => {
      const [name = "", longitude = "0", latitude = "0"] = packed.split(",", 3)
      return [fold(name), [name, Number(longitude), Number(latitude)]]
    }),
  )
  return cache.index
}

/**
 * Where a unit's people live: every home town folded onto its postort and counted, the
 * most populous first. An unplaced town is left out, with nothing to say it was.
 * @param homeTowns Each person's home town, absent where the service sent none.
 * @returns The spots, one per distinct postort.
 */
export function placeTowns(homeTowns: readonly (string | undefined)[]): readonly Spot[] {
  const index = placeIndex()
  const counts = new Map<Place, number>()
  for (const town of homeTowns) {
    const place = town === undefined ? undefined : index.get(fold(town))
    if (place !== undefined) {
      counts.set(place, (counts.get(place) ?? 0) + 1)
    }
  }
  return [...counts]
    .map(([[name, longitude, latitude], count]) => ({ count, latitude, longitude, name }))
    .toSorted((left, right) => right.count - left.count)
}
