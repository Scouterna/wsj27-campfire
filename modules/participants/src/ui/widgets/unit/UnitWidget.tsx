import { BackIcon, Card, type WidgetFrom } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import type { Care } from "../../../model/Care"
import { ageOf, fullName, whereFrom, type Participant } from "../../../model/Participant"
import { patrolSections } from "../../../model/Patrol"
import { unitNumbered } from "../../../model/Unit"
import { CareButton } from "../../components/carebutton/CareButton"
import { GenderMark } from "../../components/gender/GenderMark"
import { UnitCard } from "../../components/unitcard/UnitCard"
import { useParticipants } from "../../screens/participants/use-participants"
import { useCareSheets } from "../../use-care-sheets"

import "./UnitWidget.css"

interface PeopleCardProps {
  /**
   * What a person needs, by member number, where it is the reader's to know.
   */
  readonly careOf: (memberNo: string) => Care | undefined
  /**
   * Opens a person's care, by member number.
   */
  readonly onOpenCare: (memberNo: string) => void
  /**
   * The card's title – "Mina deltagare", "Mitt ledarteam", a patrol's name.
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
 * they ride along, with their care as a control of its own beside them. A control cannot
 * sit inside a link, so the link stands around the text and stretches over the row.
 * @param props The title, the people, their care, and whether their ages ride along.
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
          const care = props.careOf(person.memberNo)
          const from = whereFrom(person)
          return (
            <div className="unit-widget-person" key={person.memberNo}>
              <Link
                className="unit-widget-person-text"
                params={{ memberNo: person.memberNo }}
                to="/participants/$memberNo"
              >
                <span className="unit-widget-person-name">{fullName(person)}</span>
                {from === undefined ? null : (
                  <span className="unit-widget-person-from">{from}</span>
                )}
              </Link>
              {care === undefined ? null : (
                <span className="unit-widget-person-care">
                  <CareButton
                    care={care}
                    name={fullName(person)}
                    onPress={() => {
                      props.onOpenCare(person.memberNo)
                    }}
                  />
                </span>
              )}
              <span className="unit-widget-person-facts">
                {person.gender === undefined ? null : <GenderMark gender={person.gender} />}
                {age === undefined ? null : (
                  <span className="unit-widget-person-age">{age} år</span>
                )}
              </span>
              <span aria-hidden="true" className="unit-widget-person-chevron">
                <BackIcon size={14} strokeWidth={2.1} />
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

interface UnitCardsProps {
  /**
   * Why the list could not be assembled, or null while it can be.
   */
  readonly error: Error | null
  /**
   * Whether the list is still on its way.
   */
  readonly isPending: boolean
  /**
   * The unit's people, in reading order.
   */
  readonly people: readonly Participant[]
  /**
   * The unit's number.
   */
  readonly unitNumber: number
}

/**
 * The unit's cards, each person's care on their row.
 * @param props The unit and the state of its list.
 * @returns The cards.
 */
function UnitCards(props: UnitCardsProps): ReactElement {
  const { error, isPending, people, unitNumber } = props
  const { byMemberNo, notice, onOpen, sheet } = useCareSheets(people)
  const patrols = patrolSections(people)
  const careOf = (memberNo: string): Care | undefined => byMemberNo.get(memberNo)?.care

  return (
    <>
      <UnitCard
        openLabel="Se var ni bor"
        people={people}
        title="Min avdelning"
        unit={unitNumbered(unitNumber)}
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
      {notice}

      {/* The scouts' rows carry ages – the fact a leader reaches for – and the
          leaders' carry none. Once the unit is divided, its scouts come a patrol at a
          time. */}
      {patrols.length === 0 ? (
        <PeopleCard
          careOf={careOf}
          onOpenCare={onOpen}
          people={people.filter((person) => person.role === "deltagare")}
          title="Mina deltagare"
          withAges={true}
        />
      ) : (
        patrols.map((section) => (
          <PeopleCard
            careOf={careOf}
            key={section.id}
            onOpenCare={onOpen}
            people={section.people}
            title={section.label}
            withAges={true}
          />
        ))
      )}
      <PeopleCard
        careOf={careOf}
        onOpenCare={onOpen}
        people={people.filter((person) => person.role === "ledare")}
        title="Mitt ledarteam"
        withAges={false}
      />
      {sheet}
    </>
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
 * name, over a map of where its people live – then the deltagare, a patrol at a time once
 * the unit is divided, and the ledarteam, each row a doorway into the person. Reads the
 * same list the participants section holds, so opening the section afterwards costs no
 * request.
 *
 * The home screen places it for a leader and for nobody else; a viewer without a unit
 * renders nothing, so a misplaced mount stays blank rather than wrong.
 * @returns The cards, or nothing without a unit in scope.
 */
export function UnitWidget(): ReactElement | null {
  const { error, isPending, people, scope } = useParticipants()

  // The care stays below this, because reading it stores a whole unit's health answers on
  // the device, which a viewer the widget draws nothing for has no use for.
  if (scope.kind !== "unit") {
    return null
  }
  return (
    <UnitCards error={error} isPending={isPending} people={people} unitNumber={scope.unitNumber} />
  )
}
