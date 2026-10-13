import { useParams, useRouterState } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ChapterScreen } from "./ChapterScreen"

/**
 * The screen with the router attached. It reads the chapter and the section to show out
 * of the address and hands them to the screen as ordinary props, so a story can render
 * the screen with no router underneath it.
 * @returns The screen, for the chapter the address names.
 */
export function ChapterRoute(): ReactElement {
  const { chapter } = useParams({ from: "/handbook/$chapter" })
  const hash = useRouterState({ select: (state) => state.location.hash })

  return <ChapterScreen slug={chapter} {...(hash !== "" && { section: hash })} />
}
