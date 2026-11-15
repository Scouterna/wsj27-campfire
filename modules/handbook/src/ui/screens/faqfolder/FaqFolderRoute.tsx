import { useParams, useRouterState } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { FaqFolderScreen } from "./FaqFolderScreen"

/**
 * The screen with the router attached. It reads the folder and the question to open at
 * out of the address and hands them to the screen as ordinary props, so a story can
 * render the screen with no router underneath it.
 * @returns The screen, for the folder the address names.
 */
export function FaqFolderRoute(): ReactElement {
  const { folder } = useParams({ from: "/handbook/faq/$folder" })
  const hash = useRouterState({ select: (state) => state.location.hash })

  return <FaqFolderScreen folderId={folder} {...(hash !== "" && { question: hash })} />
}
