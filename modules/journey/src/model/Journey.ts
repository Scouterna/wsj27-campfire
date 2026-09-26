import type { Travel } from "@scouterna/wsj27-campfire-utils"

/**
 * The contingent's journey to Gdańsk, as dates.
 *
 * The trip is fixed and public, so it is written down here rather than fetched. The
 * dates are the contingent's plan rather than anyone's own booking, and the widget says
 * so.
 *
 * Every date is midnight local time on the day named. Comparisons are made against day
 * boundaries, so "days left" means whole days rather than a fraction that rounds oddly
 * an hour either side of midnight.
 */

/**
 * The day the rundresa's buses leave for Latvia and Lithuania.
 */
export const rundresaDeparture = new Date(2027, 6, 21)

/**
 * The day the direktresa leaves for Olsztyn, where it joins the rest of the contingent.
 */
export const direktresaDeparture = new Date(2027, 6, 26)

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
 * One person's journey – where it starts, and how long it is. Every journey ends on the
 * homecoming day; where it starts depends on how the person travels.
 */
export interface Itinerary {
  /**
   * The day the journey begins – the day the contingent's travel leaves Sweden for those
   * who travel with it, and the day the contingent reaches camp otherwise.
   */
  readonly departure: Date
  /**
   * How many days the whole journey lasts, from departure to homecoming inclusive.
   */
  readonly journeyDays: number
  /**
   * How many days are spent on the road before the camp. Zero for a journey that starts
   * at the camp.
   */
  readonly travelDays: number
}

/**
 * The itinerary for a travel choice. The rundresa and the direktresa each leave Sweden
 * on their own day; traveling on one's own, and a travel choice nobody knows, both have
 * the journey start at the camp, so nobody is put on a bus they did not book.
 * @param travel How the person travels, or undefined when the list of participants
 * gave no answer.
 * @returns The itinerary the countdown runs on.
 */
export function itinerary(travel: Travel | undefined): Itinerary {
  const departure = departureFor(travel)
  return {
    departure,
    journeyDays: daysBetween(departure, homecoming) + 1,
    travelDays: daysBetween(departure, campStart),
  }
}

function departureFor(travel: Travel | undefined): Date {
  switch (travel) {
    case "direktresa": {
      return direktresaDeparture
    }
    case "rundresa": {
      return rundresaDeparture
    }
    case "egenResa":
    case undefined: {
      return campStart
    }
  }
}

/**
 * Where a journey stands, in the order the phases run – `ahead` counts down to the
 * departure, and the rest count through the days.
 */
export type JourneyPhase = "ahead" | "traveling" | "camping" | "home"

/**
 * Which phase a given moment falls in. A journey without a road is never `traveling`,
 * because it opens on the contingent's first day at camp.
 * @param now The moment to place. Passed in rather than read from the clock, so a
 * screen renders the same way in a test as it does in August 2027.
 * @param trip Whose journey.
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
 * Clamped to the camp, so a moment outside it names the nearest end.
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
