import { useMemo, type ReactElement } from "react"

import { canBeAbout, type CaseScope } from "../../../model/CaseType"
import { unitNumberOf, type People, type Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { PersonRow } from "../../components/personrow/PersonRow"
import { UnitRow } from "../../components/unitrow/UnitRow"

/**
 * What a new case is about – a person, or a unit as a whole. More people are added on the
 * case itself, because a case is usually about one, so the form holds at most one.
 */
export type AboutChoice =
  | { readonly kind: "people"; readonly people: readonly Person[] }
  | { readonly kind: "unit"; readonly unitNumber: number }

export interface AboutQuestionProps {
  /**
   * What the case is about so far.
   */
  readonly about: AboutChoice
  /**
   * The id the question's eyebrow carries, which names it.
   */
  readonly labelId: string
  /**
   * Fires with what the case is now about.
   */
  readonly onChange: (about: AboutChoice) => void
  /**
   * Everyone the module knows, undefined while the names are loading – the units a case
   * about a whole unit can be filed under are theirs.
   */
  readonly people: People | undefined
  /**
   * The case's scope, which decides who it can be about and, for a unit's case, the unit.
   * Undefined while none is chosen, when anyone within reach may be.
   */
  readonly scope: CaseScope | undefined
}

/**
 * The units the reader sees anyone in, lowest first.
 * @param people Everyone the module knows.
 * @returns The unit numbers.
 */
function unitsOf(people: People | undefined): readonly number[] {
  const units = new Set(
    [...(people?.values() ?? [])].flatMap((person) => unitNumberOf(person) ?? []),
  )
  return [...units].toSorted((left, right) => left - right)
}

/**
 * Who the case is about: a search for one person – within the reader's reach, and for a
 * unit's case its deltagare – or a unit as a whole, which the search finds ahead of the
 * people. Whoever is chosen takes the search's place, with the way to take them off and
 * search again.
 * @param props What the case is about, what changing it does, and the scope to keep to.
 * @returns The question.
 */
export function AboutQuestion(props: AboutQuestionProps): ReactElement {
  const { about, onChange, people, scope } = props
  const unitNumber = scope?.unitNumber
  const isOffered = useMemo(
    () =>
      scope === undefined
        ? undefined
        : (candidate: Person): boolean => canBeAbout(scope, candidate),
    [scope],
  )
  // A unit's case can only be about its own unit, and any other about any unit in reach.
  const units = useMemo(
    () => (unitNumber === undefined ? unitsOf(people) : [unitNumber]),
    [people, unitNumber],
  )
  const chosen = about.kind === "people" ? about.people : []

  return (
    <div aria-labelledby={props.labelId} className="newcase-group" role="group">
      <p className="newcase-label" id={props.labelId}>
        Vem gäller det?
      </p>
      {about.kind === "unit" ? (
        <ul aria-labelledby={props.labelId} className="case-person-rows">
          <UnitRow
            action={{
              isTaking: true,
              label: "Ta bort",
              onPress: () => {
                onChange({ kind: "people", people: [] })
              },
            }}
            unitNumber={about.unitNumber}
          />
        </ul>
      ) : (
        <>
          {chosen.length > 0 ? (
            <ul aria-labelledby={props.labelId} className="case-person-rows">
              {chosen.map((person) => (
                <PersonRow
                  action={{
                    isTaking: true,
                    label: "Ta bort",
                    onPress: () => {
                      onChange({
                        kind: "people",
                        people: chosen.filter((other) => other.memberNo !== person.memberNo),
                      })
                    },
                  }}
                  isBusy={false}
                  key={person.memberNo}
                  memberNo={person.memberNo}
                  people={people}
                />
              ))}
            </ul>
          ) : (
            <PersonPicker
              isOffered={isOffered}
              labelId={props.labelId}
              nobodyText={
                unitNumber === undefined
                  ? undefined
                  : `Ingen deltagare i avdelning ${String(unitNumber)} heter så.`
              }
              onPick={(person) => {
                if (person !== undefined) {
                  onChange({ kind: "people", people: [person] })
                }
              }}
              onPickUnit={(unit) => {
                onChange({ kind: "unit", unitNumber: unit })
              }}
              picked={undefined}
              units={units}
            />
          )}
        </>
      )}
    </div>
  )
}
