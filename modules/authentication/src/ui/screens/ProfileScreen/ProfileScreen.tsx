import {
  Button,
  Callout,
  Card,
  cmtAvatarNumber,
  PageTitle,
  PersonIcon,
  UnitAvatar,
  unitsReveal,
  useIsRevealed,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

import { forgetImpersonation } from "../../../data/impersonation"
import { useSignOut } from "../../SignOutProvider"
import { useImpersonationOffer, useIsImpersonating, useWayBack } from "../../use-impersonation"

import "./ProfileScreen.css"

/**
 * The profile page, showing who is signed in and holding the one way out. Everything on
 * it is the ambient `User`'s, so the page asks the network nothing and reads the same
 * offline – except, for the contingent management, whether the auth service offers to
 * show Campfire as somebody else.
 *
 * Which unit somebody belongs to is part of the surprise, so the mark and the unit on
 * the role line wait for the units reveal – the rule the chrome's profile control
 * follows – and arrive live when it opens.
 *
 * While Campfire is shown as somebody else the page says so and offers the way back to
 * the person's own account, because nothing else in the application does.
 *
 * @returns The screen.
 */
export function ProfileScreen(): ReactElement {
  const user = useUser()
  const isUnitShown = useIsRevealed(unitsReveal.id)
  const signOut = useSignOut()
  const isOffered = useImpersonationOffer()
  const isImpersonating = useIsImpersonating()
  const wayBack = useWayBack()

  // Only outside a session, in a story without a provider, because the gate mounts the
  // person before any screen.
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
        {isImpersonating && (
          <div className="profile-screen-impersonation">
            <Callout icon={<PersonIcon />} title="Du visar Campfire som">
              {user.name}
            </Callout>
          </div>
        )}
      </Card>
      <div className="profile-screen-sign-out">
        {isImpersonating && <Button label="Tillbaka till mitt konto" onPress={wayBack} />}
        {isOffered === true && (
          <Button
            label="Visa som någon annan"
            link={{ to: "/profile/impersonate" }}
            variant="secondary"
          />
        )}
        <Button
          label="Logga ut"
          onPress={() => {
            forgetImpersonation()
            signOut(location.origin)
          }}
          {...(isImpersonating && { variant: "secondary" })}
        />
      </div>
    </>
  )
}
