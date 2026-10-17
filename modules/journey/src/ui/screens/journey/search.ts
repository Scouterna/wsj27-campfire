/**
 * What the journey screens' addresses carry: whose journey, and which moment. Both absent
 * is the reader's own unit, now.
 */
export type JourneySearch = {
  /**
   * The key of the unit or IST patrol shown – read only for the contingent management,
   * since a leader always sees their own unit.
   */
  readonly enhet?: string
  /**
   * The moment looked at, as an ISO timestamp.
   */
  readonly vid?: string
}

/**
 * The search an address actually carries, with anything unusable dropped.
 * @param search The search params the router parsed.
 * @returns The unit and the moment, where usable.
 */
export function toJourneySearch(search: Record<string, unknown>): JourneySearch {
  const enhet = search["enhet"]
  const vid = search["vid"]
  const isKey = typeof enhet === "string" && /^(?:avdelning|ist)-\d+$/u.test(enhet)
  const isMoment = typeof vid === "string" && !Number.isNaN(new Date(vid).getTime())
  return {
    ...(isKey && { enhet }),
    ...(isMoment && { vid }),
  }
}
