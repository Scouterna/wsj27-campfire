import { Button, Card, cmtTheme, PageJumps, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { istPatrolNumbered } from "../../../model/IstPatrol"
import { unitNumbered } from "../../../model/Unit"
import { istPatrolOf, unitNumberOf } from "../../../model/groups"
import { UnitCard } from "../../components/unitcard/UnitCard"
import { counted, personCount } from "../../counted"
import { PeopleList } from "../participants/PeopleList"
import { useLetterJumps } from "../participants/use-letter-jumps"
import { groupLabel, useGroup } from "./use-groups"

import "./GroupScreen.css"

/**
 * One group's count, as the line under the title, led by an IST patrol's name where it
 * has one.
 *
 * It says where the people are only when the group is a unit – the IST and the contingent
 * management are not avdelningar, and saying so would be wrong in the one place a reader
 * is checking who is where.
 * @param count How many people the group holds.
 * @param groupKey The group's key.
 * @returns The line under the title.
 */
function countOf(count: number, groupKey: string): string {
  const people = personCount(count)
  const patrol = istPatrolOf(groupKey)
  const patrolName = patrol === undefined ? undefined : istPatrolNumbered(patrol).name
  if (patrolName !== undefined) {
    return `${patrolName} · ${people}`
  }
  return unitNumberOf(groupKey) === undefined ? people : `${people} i avdelningen`
}

export interface GroupScreenProps {
  /**
   * Which group of the groups view to show – a unit number, `"ist-"` and a patrol number,
   * `"ist"`, or `"cmt-"` and a funktion, as the address carries it.
   */
  readonly groupKey: string
}

/**
 * One unit, an IST patrol, the IST outside every patrol, or one funktion of the
 * contingent management: the people that group holds.
 *
 * Read out of the list the section already fetched, so arriving here from the groups view
 * costs no request – and a key no group has is not an error, only a group with nobody in
 * it, because a unit outside the viewer's scope and a unit that does not exist are the
 * same answer.
 * @param props Which group to show.
 * @returns The screen.
 */
export function GroupScreen(props: GroupScreenProps): ReactElement {
  const { error, group, isPending, refetch } = useGroup(props.groupKey)
  const title = group?.label ?? groupLabel(props.groupKey)
  const jumps = useLetterJumps(group?.people ?? [])

  if (isPending) {
    return (
      <>
        <PageTitle title={title} />
        <p className="group-status" role="status">
          Hämtar deltagarna …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title={title} />
        <p className="group-status" role="status">
          Deltagarna kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  if (group === undefined || group.people.length === 0) {
    return (
      <>
        <PageTitle title={title} />
        <p className="group-status" role="status">
          Ingen att visa.
        </p>
      </>
    )
  }

  const unitNumber = unitNumberOf(props.groupKey)

  return (
    <>
      <PageTitle title={title} />
      <p className="group-status group-status-spoken" role="status">
        {countOf(group.people.length, props.groupKey)}
      </p>
      {/* A unit's own card, with its map – the IST and the management are no avdelning,
          and have neither a mark nor a home region. The groups view is the management's,
          so the card wears the management's color, even for a member who also leads a
          unit of their own. */}
      {unitNumber !== undefined && (
        <UnitCard
          openLabel="Visa på kartan"
          people={group.people}
          unit={unitNumbered(unitNumber)}
          viewerTheme={cmtTheme}
        />
      )}
      {/* The outline's stops over the name-sorted rows – declared, because the
          virtualized rows are not in the document for the outline to scan. */}
      <PageJumps current={jumps.current} entries={jumps.entries} onJump={jumps.onJump} />
      <Card aside={<span aria-hidden="true">{counted(group.people.length)}</span>} title="Personer">
        {/* Scoped, because everybody an entry holds belongs to what it names. */}
        <PeopleList
          isUnitScoped
          onFirstVisibleChange={jumps.onFirstVisible}
          people={group.people}
          registerJump={jumps.registerJump}
          resetKey={props.groupKey}
        />
      </Card>
    </>
  )
}
