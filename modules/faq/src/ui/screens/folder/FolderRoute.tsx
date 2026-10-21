import { useParams, useRouterState } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { FolderScreen } from "./FolderScreen"

/**
 * The folder screen at its address, reading the folder and the question to open at out
 * of it.
 *
 * Split from the screen so the screen takes them as props and renders anywhere – in a
 * story, and in a test – rather than only under a router.
 * @returns The screen for the folder the address names.
 */
export function FolderRoute(): ReactElement {
  const { folder } = useParams({ from: "/faq/$folder" })
  const hash = useRouterState({ select: (state) => state.location.hash })

  return <FolderScreen folderId={folder} {...(hash !== "" && { question: hash })} />
}
