import type { ItineraryItem } from "../../../model/Itinerary"
import { campEnd, campStart, homecoming } from "../../../model/Journey"

/**
 * Which stretch of the trip a day falls in.
 */
export type Phase = "camp" | "home" | "travel"

/**
 * The zone the trip's days are counted in – the planners' own – so a day on the strip is
 * the same day for a unit in Riga and one in Gdańsk.
 */
export const homeZone = "Europe/Stockholm"

/**
 * The day a moment falls on in Swedish time, as `YYYY-MM-DD`.
 * @param at The moment.
 * @returns The day's key, which sorts as the days do.
 */
export function dayKey(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: homeZone,
    year: "numeric",
  }).format(at)
}

/**
 * A local calendar date as a day key, for the fixed dates of the trip.
 * @param date Midnight local time on the day.
 * @returns The day's key.
 */
function localKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Which stretch of the trip a day is in – on the road, at the camp, or the day home.
 * @param key The day.
 * @returns The phase.
 */
export function phaseOf(key: string): Phase {
  if (key < localKey(campStart)) {
    return "travel"
  }
  return key <= localKey(campEnd) ? "camp" : "home"
}

/**
 * Every day of a unit's trip, from its first item to homecoming, with none skipped.
 * @param items The unit's items, in start order.
 * @returns The day keys, in order.
 */
export function tripDays(items: readonly ItineraryItem[]): readonly string[] {
  const first = items[0]
  if (first === undefined) {
    return []
  }
  const last = [dayKey(homecoming), ...items.map((item) => dayKey(item.end))]
    .toSorted((a, b) => a.localeCompare(b))
    .at(-1)
  const days: string[] = []
  // Noon in UTC is the same calendar day in every zone the trip passes through.
  for (
    let day = new Date(`${dayKey(first.start)}T12:00:00Z`);
    dayKey(day) <= (last ?? "");
    day = new Date(day.getTime() + 86_400_000)
  ) {
    days.push(dayKey(day))
  }
  return days
}

/**
 * Midday on a day in Swedish time – where a tap on the strip moves the moment to.
 * @param key The day.
 * @returns The moment.
 */
export function middayOf(key: string): Date {
  // The trip is all summer time, two hours ahead of UTC.
  return new Date(`${key}T10:00:00Z`)
}
