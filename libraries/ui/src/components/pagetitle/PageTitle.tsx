import { useLayoutEffect, useSyncExternalStore } from "react"

/**
 * The title the current page declared, and who is listening. Module state rather than a
 * context, because the declaring page and the reading chrome sit on opposite sides of
 * the router's outlet – a context would have to be provided above both, which is the one
 * place neither of them owns.
 */
const state: { title: string | undefined } = { title: undefined }
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): string | undefined {
  return state.title
}

function setPageTitle(next: string | undefined): void {
  if (state.title === next) {
    return
  }

  state.title = next
  for (const listener of listeners) {
    listener()
  }
}

export type PageTitleProps = {
  /**
   * What the screen is called.
   */
  readonly title: string
}

/**
 * Declares the page's title: render it anywhere in a page and the chrome picks it up –
 * the bar's title and the document title alike. The page is the one thing that knows
 * its own name, so every screen declares one; the route table carries no titles at
 * all. It renders nothing itself, and the declaration is withdrawn when it unmounts.
 * The write happens in a layout effect, so a title known at first render is on the bar
 * before paint rather than one frame after.
 *
 * This is the headless half of the pair. What a reader sees under the name "page title"
 * is drawn by `NavigationBar`, which is handed the title rather than reading it.
 *
 * @param props The title to declare.
 * @returns Nothing – the component renders nothing.
 */
export function PageTitle(props: PageTitleProps): null {
  useLayoutEffect(() => {
    setPageTitle(props.title)
    return () => {
      setPageTitle(undefined)
    }
  }, [props.title])

  return null
}

/**
 * The title the page declared, or undefined in the moment between one page's
 * withdrawal and the next one's declaration – a state that never paints, because the
 * declaration lands in a layout effect.
 *
 * @returns The declared title, re-rendering the caller whenever it changes.
 */
export function usePageTitle(): string | undefined {
  return useSyncExternalStore(subscribe, snapshot)
}
