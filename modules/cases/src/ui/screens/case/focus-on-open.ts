/**
 * Moves focus into a card the page's menu opened, and hands it back when the card goes.
 * Used as the card's own ref, so it runs once as the card mounts and once as it unmounts.
 *
 * The menu hands focus back to its trigger as it closes, so the card's first field takes
 * focus on the next frame rather than as it mounts, and what held focus then – the
 * trigger – is where focus returns. It returns only while focus is still in the card or
 * has fallen to the page, so a reader who has moved on elsewhere is left there.
 * @param card The card, or null as it unmounts.
 * @returns What hands focus back as the card unmounts.
 */
export function focusOnOpen(card: HTMLElement | null): (() => void) | undefined {
  if (card === null) {
    return undefined
  }
  let opener: Element | undefined
  const frame = requestAnimationFrame(() => {
    opener = document.activeElement ?? undefined
    const field = card.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
    field?.select()
  })
  return () => {
    cancelAnimationFrame(frame)
    const active = document.activeElement
    const isLost = active === null || active === document.body || card.contains(active)
    if (isLost && opener instanceof HTMLElement && opener.isConnected) {
      opener.focus()
    }
  }
}
