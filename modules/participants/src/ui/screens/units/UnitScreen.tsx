import { Button, Card, PageJumps, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Participant } from "../../../model/Participant"
import { cmtSections } from "../../../model/unit-entries"
import { counted, personCount } from "../../counted"
import { PeopleList, PersonRow } from "../participants/PeopleList"
import { useLetterJumps } from "../participants/use-letter-jumps"
import { entryLabel, useUnitGroup } from "./use-unit-entries"

import "./UnitScreen.css"

/**
 * One entry's count, as the line under the title.
 *
 * It says where the people are only when the entry is a unit – the IST and the contingent
 * management are not avdelningar, and saying so would be wrong in the one place a reader
 * is checking who is where.
 * @param count How many people the entry holds.
 * @param entryKey The entry's key.
 * @returns The line under the title.
 */
function countOf(count: number, entryKey: string): string {
  const people = personCount(count)
  return /^\d+$/u.test(entryKey) ? `${people} i avdelningen` : people
}

interface GroupedManagementProps {
  /**
   * The management's members, in reading order.
   */
  readonly people: readonly Participant[]
}

/**
 * The contingent management, grouped by funktion: a heading per group, the head of
 * contingent leading, and the roster's undetailed members closing as "Övriga". Plain
 * sections rather than the virtual list – each group is small, and the headings are
 * what the outline reads.
 * @param props The members to group.
 * @returns The grouped sections.
 */
function GroupedManagement(props: GroupedManagementProps): ReactElement {
  return (
    <>
      {cmtSections(props.people).map((section) => (
        <Card aside={counted(section.people.length)} key={section.label} title={section.label}>
          {section.people.map((person) => (
            <PersonRow key={person.memberNo} person={person} />
          ))}
        </Card>
      ))}
    </>
  )
}

export interface UnitScreenProps {
  /**
   * Which entry of the unit browser to show – a unit number, `"ist"`, or `"cmt"`, as the
   * address carries it.
   */
  readonly entryKey: string
}

/**
 * One unit, the IST, or the contingent management: the people that entry holds.
 *
 * Read out of the list the section already fetched, so arriving here from the browser
 * costs no request – and a key no entry holds is not an error, only an entry with nobody
 * in it, because a unit outside the viewer's scope and a unit that does not exist are the
 * same answer.
 * @param props Which entry to show.
 * @returns The screen.
 */
export function UnitScreen(props: UnitScreenProps): ReactElement {
  const { error, group, isPending, refetch } = useUnitGroup(props.entryKey)
  const title = group?.label ?? entryLabel(props.entryKey)
  const jumps = useLetterJumps(group?.people ?? [])

  if (isPending) {
    return (
      <>
        <PageTitle title={title} />
        <p className="unit-status" role="status">
          Hämtar deltagarna …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title={title} />
        <p className="unit-status" role="status">
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
        <p className="unit-status" role="status">
          Ingen att visa.
        </p>
      </>
    )
  }

  return (
    <>
      <PageTitle title={title} />
      {/* Spoken only: the visible answer is each list's own heading. */}
      <p className="unit-status unit-status-spoken" role="status">
        {countOf(group.people.length, props.entryKey)}
      </p>
      {props.entryKey === "cmt" ? (
        <GroupedManagement people={group.people} />
      ) : (
        <>
          {/* The outline's stops over the name-sorted rows – declared, because the
              virtualized rows are not in the document for the outline to scan. */}
          <PageJumps current={jumps.current} entries={jumps.entries} onJump={jumps.onJump} />
          <Card aside={counted(group.people.length)} title="Personer">
            <PeopleList
              onFirstVisibleChange={jumps.onFirstVisible}
              people={group.people}
              registerJump={jumps.registerJump}
              resetKey={props.entryKey}
            />
          </Card>
        </>
      )}
    </>
  )
}
