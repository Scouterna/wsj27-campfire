/**
 * The contingent's journey to Gdańsk, as dates.
 *
 * The whole trip is fixed and public, so it is written down here rather than fetched:
 * the pre-trip's buses leave Sweden on 21 July 2027, the contingent is at the jamboree
 * 29 July to 9 August, and everyone is home on 10 August. Nothing about the countdown
 * needs a server. They are the contingent's plan rather than anyone's own booking, and
 * the widget says so – a change here is a one-line edit, never a migration.
 *
 * Every date is midnight local time on the day named. Comparisons are made against day
 * boundaries, so "days left" means whole days rather than a fraction that rounds oddly
 * an hour either side of midnight.
 */

/**
 * The day the pre-trip's buses leave for Latvia and Lithuania.
 */
export const preTripDeparture = new Date(2027, 6, 21)

/**
 * The day the contingent reaches the camp on Wyspa Sobieszewska.
 */
export const campStart = new Date(2027, 6, 29)

/**
 * The contingent's last day at the camp.
 */
export const campEnd = new Date(2027, 7, 9)

/**
 * The day the contingent is home.
 */
export const homecoming = new Date(2027, 7, 10)

/**
 * How many days the contingent spends at the camp.
 */
export const campDays = daysBetween(campStart, campEnd) + 1

/**
 * One person's journey: where it starts, and how long it is. Two shapes exist today –
 * with the pre-trip, and without – and both end on the homecoming day.
 */
export interface Itinerary {
  /**
   * The day the journey begins: the buses, for the pre-trip; the day the contingent
   * reaches camp otherwise.
   */
  readonly departure: Date
  /**
   * How many days the whole journey lasts, from departure to homecoming inclusive.
   */
  readonly journeyDays: number
  /**
   * How many days are spent on the road before the camp. Zero without the pre-trip.
   */
  readonly travelDays: number
}

/**
 * The itinerary for somebody who does, or does not, join the pre-trip. Direct travel
 * and traveling on one's own both count as "not" – for them the journey is the camp.
 * @param hasPreTrip Whether the person joins the pre-trip.
 * @returns The itinerary the countdown runs on.
 */
export function itinerary(hasPreTrip: boolean): Itinerary {
  const departure = hasPreTrip ? preTripDeparture : campStart
  return {
    departure,
    journeyDays: daysBetween(departure, homecoming) + 1,
    travelDays: daysBetween(departure, campStart),
  }
}

/**
 * Where the contingent is on the journey. The phases run in this order: `ahead` counts
 * down to the departure, and the rest count through the days.
 */
export type JourneyPhase = "ahead" | "traveling" | "camping" | "home"

/**
 * Which phase a given moment falls in. Without the pre-trip nobody is ever
 * `traveling`: the journey opens on the contingent's first day at camp.
 * @param now The moment to place. Passed in rather than read from the clock, so a
 * screen renders the same way in a test as it does in August 2027.
 * @param trip Whose journey – with or without the pre-trip.
 * @returns The phase the moment falls in.
 */
export function phaseAt(now: Date, trip: Itinerary): JourneyPhase {
  if (now >= startOfDay(homecoming)) {
    return "home"
  }
  if (now >= startOfDay(campStart)) {
    return "camping"
  }
  if (now >= startOfDay(trip.departure)) {
    return "traveling"
  }
  return "ahead"
}

/**
 * A duration, broken down as the countdown shows it.
 */
export interface TimeLeft {
  readonly days: number
  readonly hours: number
  readonly minutes: number
  readonly seconds: number
}

/**
 * How long until a moment. Zero once it has passed, so nothing downstream can count
 * below it.
 * @param now The moment counting from.
 * @param until The moment counted to.
 * @returns The days, hours, minutes, and seconds left.
 */
export function timeUntil(now: Date, until: Date): TimeLeft {
  const milliseconds = Math.max(0, until.getTime() - now.getTime())
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)

  return {
    days: Math.floor(minutes / (60 * 24)),
    hours: Math.floor(minutes / 60) % 24,
    minutes: minutes % 60,
    seconds: seconds % 60,
  }
}

/**
 * Which day of the journey a moment falls on, counting the departure day as day one.
 * Clamped to the journey, so a moment outside it names the nearest end rather than a
 * day that does not exist.
 * @param now The moment to place.
 * @param trip Whose journey.
 * @returns The day number, from one to the journey's length.
 */
export function dayOfJourney(now: Date, trip: Itinerary): number {
  return clamp(daysBetween(trip.departure, now) + 1, 1, trip.journeyDays)
}

/**
 * Which day at the camp a moment falls on, counting the arrival day as day one.
 * Clamped the same way.
 * @param now The moment to place.
 * @returns The day number, from one to the camp's length.
 */
export function dayOfCamp(now: Date): number {
  return clamp(daysBetween(campStart, now) + 1, 1, campDays)
}

/**
 * Whole days from one moment to another, measured between the days they fall on so the
 * answer does not depend on the time of day.
 * @param from The moment counted from.
 * @param to The moment counted to.
 * @returns The number of whole days, negative when `to` is behind `from`.
 */
export function daysBetween(from: Date, to: Date): number {
  const day = 24 * 60 * 60 * 1000
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / day)
}

function startOfDay(moment: Date): Date {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate())
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}
