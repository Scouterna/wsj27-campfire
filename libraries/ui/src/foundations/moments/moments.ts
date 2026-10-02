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
 * yesterday, and the day and month before that, such as "20 aug".
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
  return dayAndMonth(at)
}

/**
 * A moment as a timeline says it – "idag" or "igår", or the day and month, and
 * always the time, such as "1 aug 16:40". The screen sets it in capitals.
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
  return `${dayAndMonth(at)} ${clock.format(at)}`
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
 * The day and the short month, such as "20 aug". The year is left out, because what the
 * product dates happens within one jamboree.
 * @param at The moment to write.
 * @returns The day and the month.
 */
function dayAndMonth(at: Date): string {
  return `${String(at.getDate())} ${months[at.getMonth()] ?? ""}`
}
