import { BackIcon, Card, Row, UnitAvatar, useUnitIdentities } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { ageOf, fullName, type Participant } from "../../../model/Participant"
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
   * Whether each row carries the person's age – the scouts' rows do, the leaders'
   * do not.
   */
  readonly withAges: boolean
}

/**
 * One titled card of people as a compact ledger – one column on a phone, two on a
 * desktop – each row a doorway into the person, the age at the trailing edge where one
 * rides along.
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
          return (
            <Link
              className="unit-widget-person"
              key={person.memberNo}
              params={{ memberNo: person.memberNo }}
              to="/participants/$memberNo"
            >
              <span className="unit-widget-person-text">
                <span className="unit-widget-person-name">{fullName(person)}</span>
                {person.memberGroup === undefined ? null : (
                  <span className="unit-widget-person-group">{person.memberGroup}</span>
                )}
              </span>
              {age === undefined ? null : <span className="unit-widget-person-age">{age} år</span>}
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

/**
 * The leader's unit on the home screen, as three cards: the unit itself – its mark, its
 * number, and its name once one is public – then the
 * deltagare and the ledarteam, each row a doorway into the person. Reads the same list
 * the participants section holds, so opening the section afterwards costs no request.
 *
 * The composition root mounts it for a leader and for nobody else; a viewer without a
 * unit renders nothing, so a misplaced mount stays blank rather than wrong.
 *
 * @returns The cards, or nothing without a unit in scope.
 */
export function UnitWidget(): ReactElement | null {
  const { error, isPending, people, scope } = useParticipants()
  const identities = useUnitIdentities()

  if (scope.kind !== "unit") {
    return null
  }

  const name = identities.name(scope.unitNumber)

  return (
    <>
      <Card title="Min avdelning">
        <Row leading={<UnitAvatar unitNumber={scope.unitNumber} />}>
          <strong>Avdelning {scope.unitNumber}</strong>
          {name === undefined ? null : <small>{name}</small>}
        </Row>
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
      </Card>

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
