/**
 * The lists the cases section can open on beside the reader's own, by the value the
 * address carries.
 */
export type CasesList = "closed" | "moving" | "waiting"

/**
 * The list the section's address carries, so it is still in force when the reader comes
 * back from a case and a link can open the section on it. Absent is the reader's own.
 */
export type CasesSearch = {
  /**
   * The list the section is narrowed to.
   */
  readonly lista?: CasesList
}

// The lists, as a set because this is a membership test on a value that arrived from
// outside, which the type system cannot do.
const lists: ReadonlySet<string> = new Set<CasesList>(["closed", "moving", "waiting"])

/**
 * Whether an untyped value names one of the lists.
 * @param value The value the address carried.
 * @returns True when it names a list.
 */
function isCasesList(value: unknown): value is CasesList {
  return typeof value === "string" && lists.has(value)
}

/**
 * The list an address actually carries. Anything that is not a list is dropped, so a
 * stale or hand-typed address opens on the reader's own rather than nothing.
 * @param search The search params the router parsed out of the address.
 * @returns The list to open on, absent for the reader's own.
 */
export function toCasesSearch(search: Record<string, unknown>): CasesSearch {
  const lista = search["lista"]
  return isCasesList(lista) ? { lista } : {}
}
