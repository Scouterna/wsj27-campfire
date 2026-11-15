// Written out rather than asked of Intl, because Swedish's short months carry a period
// ("aug.") the design leaves off.
const months = [
  "jan",
  "feb",
  "mars",
  "apr",
  "maj",
  "juni",
  "juli",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const

// Built once, because a formatter is expensive to build and every row and entry reads it.
const clock = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" })

/**
 * A moment as a list row says it – the time alone today, "igår" and the time
 * yesterday, and the day and month before that, such as "20 aug", with the year when it
 * is not this year's.
 * @param at The moment to write.
 * @param now The moment the reader is in, defaulting to now.
 * @returns The moment, for a reader.
 */
export function formatRowMoment(at: Date, now = new Date()): string {
  const days = daysBetween(at, now)
  if (days === 0) {
    return clock.format(at)
  }
  if (days === 1) {
    return `igår ${clock.format(at)}`
  }
  return dayAndMonth(at, now)
}

/**
 * A moment as a timeline says it – "idag" or "igår", or the day and month, with the
 * year when it is not this year's, and always the time, such as "1 aug 16:40". The
 * screen sets it in capitals.
 * @param at The moment to write.
 * @param now The moment the reader is in, defaulting to now.
 * @returns The moment, for a reader.
 */
export function formatTimelineMoment(at: Date, now = new Date()): string {
  const days = daysBetween(at, now)
  if (days === 0) {
    return `idag ${clock.format(at)}`
  }
  if (days === 1) {
    return `igår ${clock.format(at)}`
  }
  return `${dayAndMonth(at, now)} ${clock.format(at)}`
}

/**
 * How many calendar days lie between two moments, counted where the reader is, so
 * "igår" means the reader's yesterday rather than twenty-four hours ago.
 * @param from The earlier moment.
 * @param to The later moment.
 * @returns The whole days between their dates, zero for the same day.
 */
function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/**
 * The day and the short month, such as "20 aug", and the year only when it is not the
 * reader's – most of what a list dates happens in the year it is read, and a date from
 * another year without its year reads as one in this.
 * @param at The moment to write.
 * @param now The moment the reader is in.
 * @returns The day and the month, and the year where it differs.
 */
function dayAndMonth(at: Date, now: Date): string {
  const day = `${String(at.getDate())} ${months[at.getMonth()] ?? ""}`
  return at.getFullYear() === now.getFullYear() ? day : `${day} ${String(at.getFullYear())}`
}
