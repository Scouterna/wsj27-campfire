// Swedish time, whatever the device is set to, because the notes are about a Swedish
// handbook and the day an editor wrote one is the day in Sweden.
const timeZone = "Europe/Stockholm"
const dayAndMonth = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", timeZone })
const withYear = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  timeZone,
  year: "numeric",
})
const yearOf = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric" })

/**
 * The day something in the handbook changed, as its lists say it – with the year when it
 * is not this year's, so last December never reads as the one coming.
 * @param at The moment, as an ISO 8601 instant.
 * @param now The moment the reader is in, defaulting to now.
 * @returns The day and the month, such as "23 september", or "15 december 2025".
 */
export function changedOn(at: string, now = new Date()): string {
  const moment = new Date(at)
  return yearOf.format(moment) === yearOf.format(now)
    ? dayAndMonth.format(moment)
    : withYear.format(moment)
}
