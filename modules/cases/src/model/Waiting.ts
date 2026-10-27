import { lastActivity, type Case } from "./Case"
import { nameOf, type People } from "./Person"

/**
 * How long a case someone follows up may go without anything new before it waits again,
 * from a moment on – the moment absent on the first, which holds from the start.
 */
interface WaitingPeriod {
  readonly days: number
  readonly from?: Date
}

/**
 * How long a case may go quiet, oldest period first. A week while the contingent is at
 * home, and a day from the first departure, because on the trip a follow-up that waits a
 * day has waited too long. Changed by hand as the trip comes closer.
 */
const waitingPeriods: readonly WaitingPeriod[] = [
  { days: 7 },
  { days: 1, from: new Date("2027-07-21T00:00:00+02:00") },
]

/**
 * A day, for counting how long a case has been quiet.
 */
const day = 24 * 60 * 60 * 1000

/**
 * How many days a case may go quiet at a moment, by the period it falls in.
 * @param at The moment whose period decides.
 * @returns The days, zero before the first period starts.
 */
export function quietDaysAt(at: Date): number {
  const current = waitingPeriods.findLast(
    (period) => period.from === undefined || period.from.getTime() <= at.getTime(),
  )
  return current?.days ?? 0
}

/**
 * How many whole days a case has gone without anything new – its newest note, or its
 * opening before the first.
 * @param item The case to count for.
 * @param at The moment to count to.
 * @returns The whole days, rounded down.
 */
function quietDays(item: Case, at: Date): number {
  return Math.floor((at.getTime() - lastActivity(item).getTime()) / day)
}

/**
 * Whether an open case waits for someone to act on it – nobody follows it up, or nothing
 * new has happened on it for as long as the period allows.
 * @param item The case to ask about.
 * @param at The moment to ask at.
 * @returns True for an open case that waits.
 */
export function isWaiting(item: Case, at: Date): boolean {
  return (
    !item.isClosed &&
    (item.assigneeMemberNo === undefined || quietDays(item, at) >= quietDaysAt(at))
  )
}

/**
 * Where an open case stands, as its row says it: a tag beside the title for one that
 * waits, and a line naming who follows it up.
 */
export interface Standing {
  /**
   * Who follows the case up, left out where nobody does and where it would only tell the
   * reader they do themselves.
   */
  readonly line?: string
  /**
   * Why the case waits – "Ingen ansvarig", or "Sen" once it has gone quiet for too long,
   * the row's own time saying since when – absent for one that does not.
   */
  readonly mark?: string
}

/**
 * Where an open case stands – why it waits, and who follows it up.
 * @param item The case to describe.
 * @param at The moment to ask at.
 * @param people Everyone the module knows, undefined while the names are loading.
 * @param readerMemberNo The reader's own member number.
 * @returns The standing, empty for a closed case.
 */
export function standingOf(
  item: Case,
  at: Date,
  people: People | undefined,
  readerMemberNo: string | undefined,
): Standing {
  if (item.isClosed) {
    return {}
  }
  const assignee = item.assigneeMemberNo
  if (assignee === undefined) {
    return { mark: "Ingen ansvarig" }
  }
  const line = assignee === readerMemberNo ? undefined : `Ansvarig: ${nameOf(people, assignee)}`
  return {
    ...(line !== undefined && { line }),
    ...(quietDays(item, at) >= quietDaysAt(at) && { mark: "Sen" }),
  }
}
