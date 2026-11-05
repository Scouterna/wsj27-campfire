import { Card } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Participant } from "../../../model/Participant"
import type { PatrolSection } from "../../../model/Patrol"
import { counted } from "../../counted"
import type { CareSheets } from "../../use-care-sheets"
import { PersonRow } from "./PeopleList"

import "./GroupedPatrols.css"

/**
 * What `GroupedPatrols` draws: a unit's patrols and the leaders who belong to none.
 */
export interface GroupedPatrolsProps {
  /**
   * The care of the leader's unit and how a row opens it, read by the screen, which places
   * the notice and the sheet outside the sections.
   */
  readonly care: CareSheets
  /**
   * The unit's leaders.
   */
  readonly leaders: readonly Participant[]
  /**
   * The unit's patrols, each with its scouts.
   */
  readonly sections: readonly PatrolSection[]
}

/**
 * A unit grouped by patrol: a heading per patrol, the scouts in none as "Utan patrull",
 * and the leaders, who belong to no patrol, closing under their own. Plain sections rather
 * than the virtual list, because a patrol is few people and the headings are what the
 * outline reads.
 * @param props The sections to draw, and their people's care.
 * @returns The grouped sections.
 */
export function GroupedPatrols(props: GroupedPatrolsProps): ReactElement {
  const sections = [...props.sections, { id: "leaders", label: "Ledare", people: props.leaders }]
  const { byMemberNo, onOpen } = props.care
  return (
    <>
      {sections
        .filter((section) => section.people.length > 0)
        .map((section) => (
          <Card
            aside={<span aria-hidden="true">{counted(section.people.length)}</span>}
            key={section.id}
            title={section.label}
          >
            {/* A list named for its card, so a screen reader hears how many each holds. */}
            <ul aria-label={section.label} className="grouped-patrols-list">
              {section.people.map((person) => (
                <li key={person.memberNo}>
                  <PersonRow
                    care={byMemberNo.get(person.memberNo)?.care}
                    isUnitScoped
                    onOpenCare={onOpen}
                    person={person}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ))}
    </>
  )
}
