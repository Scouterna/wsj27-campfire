import { useLayoutEffect, useSyncExternalStore } from "react"

/**
 * The jump entries the current page declared, and who is listening. Module state for
 * the same reason as the page title's: the declaring page and the reading chrome sit
 * on opposite sides of the router's outlet.
 */
const state: { declared: PageJumpsProps | undefined } = { declared: undefined }
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): PageJumpsProps | undefined {
  return state.declared
}

function setPageJumps(next: PageJumpsProps | undefined): void {
  state.declared = next
  for (const listener of listeners) {
    listener()
  }
}

export type PageJumpsProps = {
  /**
   * The stops, in the order the page holds them – the letter ranges of a long list,
   * for one.
   */
  readonly entries: readonly string[]
  /**
   * The stop the reader is at, by index.
   */
  readonly current: number
  /**
   * What choosing a stop does. Scrolling the page there is the page's to do – the
   * chrome knows the names, not the content.
   */
  readonly onJump: (index: number) => void
}

/**
 * Declares the page's jump stops from anywhere in a page, the way `PageTitle` declares
 * its name: the chrome's outline column offers them in place of the scanned headings.
 * For a page whose sections are not in the document – a virtualized list has rows for
 * the viewport only – this is the one way the outline can know them. Renders nothing;
 * withdrawn on unmount, and the outline falls back to its heading scan.
 *
 * @param props The stops, the current one, and what choosing one does.
 * @returns Nothing – the component renders nothing.
 */
export function PageJumps(props: PageJumpsProps): null {
  const { current, entries, onJump } = props
  useLayoutEffect(() => {
    setPageJumps({ current, entries, onJump })
    return () => {
      setPageJumps(undefined)
    }
  }, [current, entries, onJump])

  return null
}

/**
 * The jump stops the page declared, or undefined when it declared none.
 *
 * @returns The declared stops, re-rendering the caller whenever they change.
 */
export function usePageJumps(): PageJumpsProps | undefined {
  return useSyncExternalStore(subscribe, snapshot)
}
