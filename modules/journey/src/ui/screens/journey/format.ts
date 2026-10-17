import { zoneOf, type ItemKind, type ItineraryItem } from "../../../model/Itinerary"

/**
 * The kinds as the screen names them.
 */
export const kindLabels: Readonly<Record<ItemKind, string>> = {
  activity: "Aktivitet",
  gathering: "Samling",
  meal: "Måltid",
  overnight: "Övernattning",
  travel: "Resa",
}

/**
 * A clock time in a zone, such as "07:30".
 * @param at The moment.
 * @param timeZone The zone to read the clock in.
 * @returns The time.
 */
export function clock(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone }).format(
    at,
  )
}

/**
 * A day as a heading, such as "lördag 21 juli".
 * @param at A moment on the day.
 * @param timeZone The zone the day is counted in.
 * @returns The day.
 */
export function dayName(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  }).format(at)
}

/**
 * A moment in full, such as "lör 21 juli 07:30".
 * @param at The moment.
 * @param timeZone The zone.
 * @returns The moment.
 */
export function moment(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone,
    weekday: "short",
  }).format(at)
}

/**
 * The zone's short name where it differs from Swedish time, such as " (EEST)".
 * @param at The moment, since summer time decides the name.
 * @param timeZone The zone.
 * @returns The suffix, empty in Swedish time.
 */
export function zoneSuffix(at: Date, timeZone: string): string {
  if (clock(at, timeZone) === clock(at, "Europe/Stockholm")) {
    return ""
  }
  const name = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value
  return name === undefined ? "" : ` lokal tid (${name})`
}

/**
 * Where an item happens, in a line: the place, or where a journey goes from and to.
 * @param item The item.
 * @returns The line, empty where the plan names no place.
 */
export function whereLine(item: ItineraryItem): string {
  if (item.from !== undefined || item.to !== undefined) {
    return `${item.from?.name ?? "?"} → ${item.to?.name ?? "?"}`
  }
  if (item.place === undefined) {
    return ""
  }
  return item.place.city === undefined || item.place.name.includes(item.place.city)
    ? item.place.name
    : `${item.place.name}, ${item.place.city}`
}

/**
 * An item's span in its own zone, such as "07:30–08:30" or "17:00 – sön 22 juli 11:00".
 * @param item The item.
 * @returns The span.
 */
export function span(item: ItineraryItem): string {
  const zone = zoneOf(item)
  const endZone = item.to?.timeZone ?? zone
  const isSameDay = dayName(item.start, zone) === dayName(item.end, endZone)
  const end = isSameDay ? clock(item.end, endZone) : moment(item.end, endZone)
  return `${clock(item.start, zone)}–${end}${zoneSuffix(item.start, zone)}`
}

/**
 * A moment as a `datetime-local` field holds it, in the browser's own zone.
 * @param at The moment.
 * @returns The field value, such as "2027-07-21T07:30".
 */
export function toFieldValue(at: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}
