// Swedish time, whatever the device is set to, because the notes are about a Swedish
// handbook and the day an editor wrote one is the day in Sweden.
const format = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Stockholm",
})

/**
 * The day a change note was written, as the handbook's lists say it.
 * @param at The note's moment, as an ISO 8601 instant.
 * @returns The day and the month, such as "23 september".
 */
export function changedOn(at: string): string {
  return format.format(new Date(at))
}
