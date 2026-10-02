import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { FolderScreen } from "./FolderScreen"

/**
 * The folder screen at its address, reading the Drive id out of the path.
 *
 * Split from the screen so the screen takes the folder as a prop and renders anywhere – in
 * a story, and in a test – rather than only under a router.
 * @returns The screen for the folder the address names.
 */
export function FolderRoute(): ReactElement {
  const { folder } = useParams({ from: "/material/$folder" })
  return <FolderScreen folderId={folder} />
}
