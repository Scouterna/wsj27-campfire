import { Button, Card, PageTitle, unitsReveal, useIsRevealed } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { ImpersonationTarget } from "../../../model/ImpersonationTarget"
import { roleLineFor, roleLineWithUnitFor } from "../../../model/User"
import { TargetMark } from "../../components/targetmark/TargetMark"
import {
  useImpersonate,
  useImpersonationOffer,
  useImpersonationTargets,
  useWayBack,
  type ImpersonateFailure,
} from "../../use-impersonation"

import "./ImpersonationConfirmScreen.css"

/**
 * What a failed attempt says, in the person's words.
 * @param failure Why it failed.
 * @param target Who the attempt was for.
 * @returns The sentence.
 */
function failureText(failure: ImpersonateFailure, target: ImpersonationTarget): string {
  switch (failure) {
    case "forbidden": {
      return "Ditt konto får inte visa Campfire som någon annan."
    }
    case "notReady": {
      return "Rollerna är inte inlästa än. Försök igen om en stund."
    }
    case "unavailable": {
      return `Det går inte att visa Campfire som ${target.firstName} här.`
    }
    case "unreadable": {
      return `Inloggningen bytte till ${target.firstName}, men Campfire kunde inte läsa den. Gå tillbaka till ditt konto och försök igen.`
    }
    case "failed": {
      return "Det gick inte att byta. Försök igen."
    }
  }
}

export interface ImpersonationConfirmScreenProps {
  /**
   * The member to be shown Campfire as, by member number.
   */
  readonly memberNo: string
}

/**
 * The confirmation before Campfire is shown as somebody else: who they are, what happens,
 * and how to come back. Confirming replaces the session, so the page loads again from
 * its start as them.
 * @param props The member to be shown Campfire as.
 * @returns The screen.
 */
export function ImpersonationConfirmScreen(props: ImpersonationConfirmScreenProps): ReactElement {
  const isUnitShown = useIsRevealed(unitsReveal.id)
  const isOffered = useImpersonationOffer()
  const { isPending: isListPending, targets } = useImpersonationTargets(isOffered === true)
  const { failure, impersonate, isPending } = useImpersonate()
  const wayBack = useWayBack()

  const target = targets.find((candidate) => candidate.memberNo === props.memberNo)

  if (target === undefined) {
    const isWaiting = isOffered === undefined || isListPending
    return (
      <>
        <PageTitle title="Visa som någon annan" />
        <p className="impersonation-confirm-screen-text" role="status">
          {isWaiting ? "Hämtar …" : "Den här personen går inte att visa Campfire som."}
        </p>
        {!isWaiting && (
          <Button
            label="Tillbaka till listan"
            link={{ to: "/profile/impersonate" }}
            variant="plain"
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageTitle title={`Visa som ${target.firstName}`} />
      <Card>
        <div className="impersonation-confirm-screen-person">
          <TargetMark isUnitShown={isUnitShown} size="profile" target={target} />
          <div className="impersonation-confirm-screen-name">
            <strong>{target.name}</strong>
            <span>
              {isUnitShown
                ? roleLineWithUnitFor(target.roles, target.unit)
                : roleLineFor(target.roles)}
            </span>
          </div>
        </div>
      </Card>
      <p className="impersonation-confirm-screen-text">
        Du loggas in som {target.firstName} och ser Campfire precis som {target.firstName} gör.
        Profilen tar dig tillbaka till ditt eget konto, och efter en stund loggas du ut av dig
        själv.
      </p>
      {failure !== undefined && (
        <p className="impersonation-confirm-screen-failure" role="alert">
          {failureText(failure, target)}
        </p>
      )}
      <div className="impersonation-confirm-screen-actions">
        {failure === "unreadable" ? (
          <Button label="Tillbaka till mitt konto" onPress={wayBack} />
        ) : (
          <Button
            disabled={isPending}
            label={`Visa som ${target.firstName}`}
            onPress={() => {
              impersonate(target.memberNo)
            }}
          />
        )}
      </div>
    </>
  )
}
