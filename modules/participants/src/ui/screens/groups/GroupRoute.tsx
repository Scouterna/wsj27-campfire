import { useParams } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { GroupScreen } from "./GroupScreen"

/**
 * The screen with the router attached. It reads the group's key out of the address and
 * hands it to the screen as an ordinary prop, so a story can render the screen with no
 * router underneath it.
 * @returns The screen, for the group the address names.
 */
export function GroupRoute(): ReactElement {
  const { group } = useParams({ from: "/participants/groups/$group" })

  return <GroupScreen groupKey={group} />
}
