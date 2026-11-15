import { Navigate } from "@tanstack/react-router"
import type { ReactElement } from "react"

/**
 * Sends a reader who asked for the public handbook, without saying whose, on to the
 * leaders' – the only one there is – keeping what the address asked for and the place
 * it named, and leaving no entry behind to come back to.
 * @returns Nothing to see.
 */
export function PublicHandbookRedirect(): ReactElement {
  return (
    <Navigate
      hash={location.hash.slice(1)}
      replace
      search={(search) => search}
      to="/public/handbook/leaders"
    />
  )
}
