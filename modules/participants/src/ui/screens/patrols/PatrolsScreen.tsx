import { Button, PageTitle, ParticipantsIcon } from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement } from "react"

import { useViewer } from "../../../data/viewer"
import { isPatrolMember } from "../../../model/Patrol"
import { EmptyState } from "../../components/emptystate/EmptyState"
import { useParticipants } from "../participants/use-participants"
import { PatrolEditor } from "./PatrolEditor"

import "./PatrolsScreen.css"

/**
 * Patruller: a leader divides their unit into its patrols by carrying people between
 * them, or moving them from each person's menu, with each patrol's size and gender mix
 * beside it – and saves once the unit looks the way the leaders want it.
 *
 * Only a unit's own leaders may set its patrols, so anybody else is told so rather than
 * shown an editor whose save the service would refuse.
 * @returns The screen.
 */
export function PatrolsScreen(): ReactElement {
  const viewer = useViewer()
  const { error, isPending, people, refetch } = useParticipants()
  const unit = viewer.unitNumber
  const members = useMemo(
    () => people.filter((person) => person.unit?.number === unit && isPatrolMember(person)),
    [people, unit],
  )

  if (unit === undefined) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status">Patrullerna delas in av avdelningens egna ledare.</p>
      </>
    )
  }

  if (isPending) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status" role="status">
          Hämtar avdelningen …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status" role="status">
          Avdelningen kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  if (members.length === 0) {
    return (
      <>
        <PageTitle title="Patruller" />
        <EmptyState
          hint="Patrullerna delas in när avdelningen har fått sina deltagare."
          icon={<ParticipantsIcon size={28} strokeWidth={1.8} />}
          title="Inga scouter än"
        />
      </>
    )
  }

  return (
    <>
      <PageTitle title="Patruller" />
      <PatrolEditor people={members} />
    </>
  )
}
