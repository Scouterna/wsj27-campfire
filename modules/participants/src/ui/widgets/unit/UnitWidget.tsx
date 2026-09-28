import { BackIcon, Card, type WidgetFrom } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ageOf, fullName, whereFrom, type Participant } from "../../../model/Participant"
import { GenderMark } from "../../components/gender/GenderMark"
import { UnitCard } from "../../components/unitcard/UnitCard"
import { useParticipants } from "../../screens/participants/use-participants"

import "./UnitWidget.css"

interface PeopleCardProps {
  /**
   * The card's title – "Mina deltagare", "Mitt ledarteam".
   */
  readonly title: string
  /**
   * The card's people, in reading order.
   */
  readonly people: readonly Participant[]
  /**
   * Whether each row carries the person's age.
   */
  readonly withAges: boolean
}

/**
 * One titled card of people as a compact ledger, each row a doorway into the person –
 * the name, where they come from, and the gender and the age at the trailing edge where
 * they ride along.
 * @param props The title, the people, and whether their ages ride along.
 * @returns The card, or nothing when it holds nobody.
 */
function PeopleCard(props: PeopleCardProps): ReactElement | null {
  if (props.people.length === 0) {
    return null
  }
  return (
    <Card title={props.title}>
      <div className="unit-widget-people">
        {props.people.map((person) => {
          const age = props.withAges ? ageOf(person, new Date()) : undefined
          const from = whereFrom(person)
          return (
            <Link
              className="unit-widget-person"
              key={person.memberNo}
              params={{ memberNo: person.memberNo }}
              to="/participants/$memberNo"
            >
              <span className="unit-widget-person-text">
                <span className="unit-widget-person-name">{fullName(person)}</span>
                {from === undefined ? null : (
                  <span className="unit-widget-person-from">{from}</span>
                )}
              </span>
              <span className="unit-widget-person-facts">
                {person.gender === undefined ? null : <GenderMark gender={person.gender} />}
                {age === undefined ? null : (
                  <span className="unit-widget-person-age">{age} år</span>
                )}
              </span>
              <span aria-hidden="true" className="unit-widget-person-chevron">
                <BackIcon size={14} strokeWidth={2.1} />
              </span>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

declare module "@scouterna/wsj27-campfire-ui" {
  interface WidgetRegistry {
    /**
     * A leader's own unit: the unit itself, its participants, and its leader team.
     */
    "participants:unit": WidgetFrom<"participants">
  }
}

/**
 * The leader's unit on the home screen: the unit itself – its mark, its number, and its
 * name where the identities know one, over a map of where its people live – then the
 * deltagare and the ledarteam, each row a doorway into the person. Reads the same list
 * the participants section holds, so opening the section afterwards costs no request.
 *
 * The home screen places it for a leader and for nobody else; a viewer without a unit
 * renders nothing, so a misplaced mount stays blank rather than wrong.
 * @returns The cards, or nothing without a unit in scope.
 */
export function UnitWidget(): ReactElement | null {
  const { error, isPending, people, scope } = useParticipants()

  if (scope.kind !== "unit") {
    return null
  }

  return (
    <>
      <UnitCard
        openLabel="Se var ni bor"
        people={people}
        title="Min avdelning"
        unitNumber={scope.unitNumber}
      >
        {isPending && (
          <p className="unit-widget-note" role="status">
            Hämtar deltagarna …
          </p>
        )}
        {!isPending && error !== null && (
          <p className="unit-widget-note" role="status">
            Deltagarna kunde inte hämtas.
          </p>
        )}
      </UnitCard>

      {/* The scouts' rows carry ages – the fact a leader reaches for – and the
          leaders' carry none. */}
      <PeopleCard
        people={people.filter((person) => person.role === "deltagare")}
        title="Mina deltagare"
        withAges={true}
      />
      <PeopleCard
        people={people.filter((person) => person.role === "ledare")}
        title="Mitt ledarteam"
        withAges={false}
      />
    </>
  )
}
