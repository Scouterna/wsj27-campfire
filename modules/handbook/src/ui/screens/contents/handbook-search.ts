/**
 * The search the contents' address carries, so a search can be returned to by a history
 * pop and reloaded into the same hits. Absent is the contents themselves.
 */
export type HandbookSearch = {
  /**
   * The search text, trimmed and never empty.
   */
  readonly q?: string
}

/**
 * The search an address actually carries, read back from whatever is in its search
 * params. Anything that is not usable text is dropped, so the worst a stale address can
 * do is open the contents.
 * @param search The search params the router parsed out of the address.
 * @returns The search to run.
 */
export function toHandbookSearch(search: Record<string, unknown>): HandbookSearch {
  const q = search["q"]
  const text = typeof q === "string" ? q.trim() : ""
  return text === "" ? {} : { q: text }
}
