import {
  Button,
  Card,
  cmtAvatarNumber,
  PageTitle,
  UnitAvatar,
  unitsReveal,
  useIsRevealed,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

import { useSignOut } from "../../SignOutProvider"

import "./ProfileScreen.css"

/**
 * The profile page: who is signed in – their mark, their name, and what they are in
 * the contingent – and the one way out. Everything on it is the ambient `User`'s, so
 * the page asks the network nothing and reads the same offline.
 *
 * Which unit somebody belongs to is part of the surprise, so the mark and the unit on
 * the role line wait for the units reveal – the rule the chrome's profile control
 * follows – and arrive live when it opens.
 *
 * @returns The screen.
 */
export function ProfileScreen(): ReactElement {
  const user = useUser()
  const isUnitShown = useIsRevealed(unitsReveal.id)
  const signOut = useSignOut()

  // Only outside a session – a story without a provider. The gate mounts the person
  // before any screen.
  if (user === undefined) {
    return <PageTitle title="Profil" />
  }

  return (
    <>
      <PageTitle title="Profil" />
      <Card>
        <div className="profile-screen">
          {isUnitShown && user.mark !== undefined && (
            <UnitAvatar
              isLeader={user.mark.isLeader}
              size="profile"
              unitNumber={user.mark.unitNumber ?? cmtAvatarNumber}
            />
          )}
          <div className="profile-screen-person">
            <strong>{user.name}</strong>
            <span>{isUnitShown ? user.roleLineWithUnit : user.roleLine}</span>
          </div>
        </div>
      </Card>
      <div className="profile-screen-sign-out">
        <Button label="Logga ut" onPress={signOut} />
      </div>
    </>
  )
}
