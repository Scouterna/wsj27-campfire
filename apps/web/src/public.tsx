import { publicHandbookRoutes } from "@scouterna/wsj27-campfire-handbook"
import { matchScreen, type Routes } from "@scouterna/wsj27-campfire-ui"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"

import { publicQueryClient } from "./query"

/**
 * Every screen anyone may open without signing in – outside the gate, the guard, and the
 * chrome, because each is a whole page of its own.
 */
export const publicScreens = { ...publicHandbookRoutes } satisfies Routes

/**
 * Whether an address is one of the public screens.
 * @param pathname The address, as `location.pathname` spells it.
 * @returns True for a public screen.
 */
export function isPublic(pathname: string): boolean {
  return matchScreen(pathname, publicScreens) !== undefined
}

type PublicChromeProps = {
  /**
   * The public screen.
   */
  readonly children: ReactNode
}

/**
 * All a public screen stands in: a query client of its own, and nothing drawn around it.
 * @param props The screen.
 * @returns The screen, with the client in scope.
 */
export function PublicChrome(props: PublicChromeProps): ReactElement {
  return <QueryClientProvider client={publicQueryClient}>{props.children}</QueryClientProvider>
}
