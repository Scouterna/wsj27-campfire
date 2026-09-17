import { Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles, type Role } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

/**
 * What the participants section is called for these roles – a leader's section is
 * their own unit, so their menu entry and their screen wear the unit's name rather
 * than the whole list's. One source for the words, because the application's menu and
 * this module's screen must agree.
 * @param roles The signed-in person's roles.
 * @returns "Min avdelning" when the roles carry a leader, otherwise "Deltagare".
 */
export function participantsSectionLabel(roles: readonly Role[]): string {
  return hasAnyRole(roles, "leader") ? "Min avdelning" : "Deltagare"
}

/**
 * The participants screen: the list of participants, everyone travelling with the
 * contingent. A placeholder until the list feature lands. The screen owns its
 * role-aware title – the chrome's bar picks it up through `PageTitle`.
 *
 * @returns The screen.
 */
export function ParticipantsScreen(): ReactElement {
  const roles = useRoles()

  return (
    <>
      <PageTitle title={participantsSectionLabel(roles)} />
      <Card>
        <p>Sidan kommer snart.</p>
      </Card>
    </>
  )
}
