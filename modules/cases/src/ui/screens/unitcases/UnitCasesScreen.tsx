import { Button, Card, PageActions, PageTitle, PlusIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import {
  byLastActivity,
  isAboutUnit,
  unitOfCase,
  unitsOfCase,
  type Case,
} from "../../../model/Case"
import type { People } from "../../../model/Person"
import { CaseList } from "../../components/caselist/CaseList"
import { SubjectCard } from "../../components/subjectcard/SubjectCard"
import { casesSectionLabel } from "../../section-label"
import { useCasesAccess } from "../../use-cases-access"
import { useCases } from "../cases/use-cases"

import "./UnitCasesScreen.css"

/**
 * The unit whose cases the screen shows, by number.
 */
export interface UnitCasesScreenProps {
  /**
   * Whose cases to show – the unit the address's `$unitNumber` parameter carries.
   */
  readonly unitNumber: number
}

/**
 * Whether a case is about someone in a unit – a unit's own case by the unit it belongs
 * to, and any other by where the people it is about are now.
 * @param item The case to place.
 * @param unitNumber The unit to test for.
 * @param people Everyone the module knows, which places the people the case is about.
 * @returns True when the case is about people, and in the unit.
 */
function isAboutSomeoneIn(item: Case, unitNumber: number, people: People | undefined): boolean {
  return item.aboutMemberNos.length > 0 && unitsOfCase(item, people).includes(unitNumber)
}

/**
 * Every case about one unit, under a card saying which, and the way to open another
 * about it: the open cases about the unit as a whole, then the open cases about anyone in
 * it, and the closed ones of both, each the latest change first. A case about someone in
 * the unit is found by the names, so the screen waits for them before it says it has none,
 * and says so when they could not be read, since those cases are then missing.
 * @param props Which unit's cases to show.
 * @returns The screen.
 */
export function UnitCasesScreen(props: UnitCasesScreenProps): ReactElement {
  const { unitNumber } = props
  const { cases, error, isPending, isPeoplePending, people, peopleError, refetch, refetchPeople } =
    useCases()
  const { canOpen } = useCasesAccess()
  const name = `Avdelning ${String(unitNumber)}`

  const whole = cases.filter((item) => isAboutUnit(item) && unitOfCase(item) === unitNumber)
  const ofPeople = cases.filter((item) => isAboutSomeoneIn(item, unitNumber, people))
  const lists = [
    { cases: whole.filter((item) => !item.isClosed), title: "Hela avdelningen" },
    { cases: ofPeople.filter((item) => !item.isClosed), title: "Personer i avdelningen" },
    {
      cases: [...whole, ...ofPeople].filter((item) => item.isClosed),
      title: "Avslutade",
    },
  ]
    .map((list) => ({ ...list, cases: byLastActivity(list.cases) }))
    .filter((list) => list.cases.length > 0)

  return (
    <>
      <PageTitle title={casesSectionLabel} />
      <PageActions
        action={
          canOpen
            ? {
                icon: <PlusIcon size={26} strokeWidth={2.2} />,
                label: "Nytt ärende",
                link: {
                  params: { unitNumber: String(unitNumber) },
                  to: "/cases/new/unit/$unitNumber",
                },
              }
            : undefined
        }
      />

      <SubjectCard about={undefined} name={name} unitNumber={unitNumber} />

      {(isPending || (error === null && isPeoplePending)) && (
        <p className="unit-cases-status" role="status">
          Hämtar ärendena …
        </p>
      )}

      {!isPending && error !== null && (
        <>
          <p className="unit-cases-status" role="alert">
            Ärendena kunde inte hämtas.
          </p>
          <Button label="Försök igen" onPress={refetch} />
        </>
      )}

      {!isPending && error === null && peopleError !== null && (
        <>
          <p className="unit-cases-status" role="alert">
            Avdelningens personer kunde inte hämtas, så ärenden om dem saknas.
          </p>
          <Button label="Försök igen" onPress={refetchPeople} />
        </>
      )}

      {lists.map((list) => (
        <CaseList cases={list.cases} key={list.title} people={people} title={list.title} />
      ))}

      {!isPending && error === null && people !== undefined && lists.length === 0 && (
        <Card>
          <p className="unit-cases-empty">Inga ärenden om {name.toLocaleLowerCase("sv")}.</p>
        </Card>
      )}
    </>
  )
}
