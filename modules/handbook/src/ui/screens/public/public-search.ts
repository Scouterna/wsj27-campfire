/**
 * The search the public handbook's address carries.
 */
export type PublicSearch = {
  /**
   * Whether the address asks for the paper copy at once – `?pdf` opens the print dialog,
   * where the browser saves a PDF, as soon as the handbook is on screen.
   */
  readonly pdf?: true
}

/**
 * The search an address actually carries. The router reads a bare `?pdf` as an empty
 * value, so the name alone is what counts.
 * @param search The search params the router parsed out of the address.
 * @returns The search.
 */
export function toPublicSearch(search: Record<string, unknown>): PublicSearch {
  return "pdf" in search ? { pdf: true } : {}
}
