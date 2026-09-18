// Constructed once: a formatter is expensive to build and free to reuse.
const swedish = new Intl.NumberFormat("sv-SE")

/**
 * A list's count as its card wears it: "59 st" – or "2 av 59 st" when a narrowing left
 * fewer than there are. Handed to `Card` as the aside beside the list's title, hidden
 * from assistive technology there: every screen that shows it already speaks the count
 * through its status line, and a card reads its aside aloud.
 * @param count How many rows the list holds.
 * @param total How many there are before any narrowing. Equal to `count`, or left out,
 * reads as the plain count.
 * @returns The counted label.
 */
export function counted(count: number, total?: number): string {
  if (total === undefined || total === count) {
    return `${swedish.format(count)} st`
  }
  return `${swedish.format(count)} av ${swedish.format(total)} st`
}

/**
 * People counted in words: "1 person", "59 personer". The Swedish singular, shared so
 * no screen writes "1 personer".
 * @param count How many people.
 * @returns The count with its noun.
 */
export function personCount(count: number): string {
  return count === 1 ? "1 person" : `${swedish.format(count)} personer`
}
