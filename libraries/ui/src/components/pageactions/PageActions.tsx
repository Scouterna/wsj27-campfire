import { useLayoutEffect, useSyncExternalStore } from "react"

import type { OverflowMenuItem } from "../overflowmenu/OverflowMenu"

/**
 * The actions the current page declared, and who is listening. Module state for the
 * same reason as the page title's: the declaring page and the reading chrome sit on
 * opposite sides of the router's outlet.
 */
const state: { declared: PageActionsProps | undefined } = { declared: undefined }
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): PageActionsProps | undefined {
  return state.declared
}

function setPageActions(next: PageActionsProps | undefined): void {
  state.declared = next
  for (const listener of listeners) {
    listener()
  }
}

export type PageActionsProps = {
  /**
   * The page's one primary action, drawn as the button beside the title on a desktop.
   */
  readonly action?:
    | {
        /**
         * What the button says.
         */
        readonly label: string
        /**
         * What pressing it does.
         */
        readonly onPress: () => void
      }
    | undefined
  /**
   * The page's extra actions, drawn as the overflow menu – beside the title on a
   * desktop, in the bar on a phone.
   */
  readonly menu?: readonly OverflowMenuItem[] | undefined
}

/**
 * Declares the page's bar actions from anywhere in a page, the way `PageTitle`
 * declares its name: the chrome picks them up and places them per width. Renders
 * nothing; withdrawn on unmount. A page without one gets a bar with no actions.
 *
 * @param props The primary action and the overflow entries to declare.
 * @returns Nothing – the component renders nothing.
 */
export function PageActions(props: PageActionsProps): null {
  const { action, menu } = props
  useLayoutEffect(() => {
    setPageActions({ action, menu })
    return () => {
      setPageActions(undefined)
    }
  }, [action, menu])

  return null
}

/**
 * The actions the page declared, or undefined when it declared none.
 *
 * @returns The declared actions, re-rendering the caller whenever they change.
 */
export function usePageActions(): PageActionsProps | undefined {
  return useSyncExternalStore(subscribe, snapshot)
}
