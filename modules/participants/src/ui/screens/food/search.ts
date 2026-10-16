/**
 * One expanded row – its card and its person – so the same person's row in two cards
 * opens on its own.
 */
export type RowKey = `${"allergen-" | "diet-"}${string}:${string}` | `ungraded:${string}`

/**
 * The overview's address state, so a row left open is open again when the reader comes
 * back to it.
 */
export type FoodSearch = {
  /**
   * The keys of the expanded rows, in the order they were opened. Absent when none is,
   * rather than an empty list hanging off the address.
   */
  readonly open?: readonly RowKey[]
}

/**
 * The shape every row key takes – a card, a colon, and a member number.
 */
const rowKeyPattern = /^(?:(?:allergen|diet)-[A-Za-z]+|ungraded):\d+$/u

/**
 * Whether an untyped value is a well-formed row key.
 * @param value The value the address carried.
 * @returns True when it can name a row.
 */
function isRowKey(value: unknown): value is RowKey {
  return typeof value === "string" && rowKeyPattern.test(value)
}

/**
 * The expanded rows an address actually carries, read back from whatever is in its search
 * params. Nothing is trusted, because an address is hand-typed or pasted, so anything
 * that is not a well-formed key is dropped, and so is a key given twice.
 * @param search The search params the router parsed out of the address.
 * @returns The rows to expand, with every unusable part left out.
 */
export function toFoodSearch(search: Record<string, unknown>): FoodSearch {
  const raw = search["open"]
  const open = Array.isArray(raw) ? [...new Set(raw.filter((key) => isRowKey(key)))] : []
  return open.length === 0 ? {} : { open }
}

/**
 * The expanded rows with one row toggled – added when it was closed, removed when open.
 * @param open The rows expanded now.
 * @param key The row to toggle.
 * @returns The rows to expand next, as the address carries them.
 */
export function toggled(open: readonly RowKey[], key: RowKey): FoodSearch {
  const next = open.includes(key) ? open.filter((entry) => entry !== key) : [...open, key]
  return next.length === 0 ? {} : { open: next }
}
