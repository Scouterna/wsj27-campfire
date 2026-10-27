import { Button } from "@scouterna/wsj27-campfire-ui"
import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react"

import { canBeAbout, type CaseScope } from "../../../model/CaseType"
import { unitNumberOf, type People, type Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { PersonRow } from "../../components/personrow/PersonRow"
import { useOwnUnit } from "../../use-people"

/**
 * What a new case is about – one or more people, or a unit as a whole.
 */
export type AboutChoice =
  | { readonly kind: "people"; readonly people: readonly Person[] }
  | { readonly kind: "unit"; readonly unitNumber: number }

/**
 * What the case is about so far, what changing it does, and the scope to keep to.
 */
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
 * @returns The unit numbers, lowest first.
 */
function unitsOf(people: People | undefined): readonly number[] {
  const units = new Set(
    [...(people?.values() ?? [])].flatMap((person) => unitNumberOf(person) ?? []),
  )
  return [...units].toSorted((left, right) => left - right)
}

/**
 * What a search says when nobody it may offer has the name typed – for a unit's case, that
 * nobody in the unit does, naming the unit unless it is the reader's own.
 * @param unitNumber The unit a unit's case keeps to, undefined for any other case.
 * @param ownUnit The one unit the reader leads, undefined for everyone else.
 * @returns The words, or undefined for the search's own.
 */
function nobodyTextFor(
  unitNumber: number | undefined,
  ownUnit: number | undefined,
): string | undefined {
  if (unitNumber === undefined) {
    return undefined
  }
  const unit = unitNumber === ownUnit ? "avdelningen" : `avdelning ${String(unitNumber)}`
  return `Ingen deltagare i ${unit} heter så.`
}

/**
 * Who the case is about: a search for a person – within the reader's reach, and for a
 * unit's case its deltagare – or a unit as a whole, which the search finds ahead of the
 * people. Whoever is chosen takes the search's place, and more people can be added under
 * them through a search of its own, which leaves out those already chosen.
 * @param props What the case is about, what changing it does, and the scope to keep to.
 * @returns The question.
 */
export function AboutQuestion(props: AboutQuestionProps): ReactElement {
  const { about, onChange, people, scope } = props
  const unitNumber = scope?.unitNumber
  const nobodyText = nobodyTextFor(unitNumber, useOwnUnit())
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
  const chosen = useMemo(() => (about.kind === "people" ? about.people : []), [about])
  // Focus follows whatever takes the place of what the reader was on – the row chosen,
  // the search, or the way to add someone – rather than falling to the page. Undefined
  // until the reader changes something, so a form that opens with someone chosen moves
  // nothing.
  const [focused, setFocused] = useState<"add" | "picker" | "row" | undefined>(undefined)
  const [removals, setRemovals] = useState(0)
  const change = (next: AboutChoice): void => {
    if (next.kind === "people" && next.people.length === 0) {
      setFocused("picker")
    } else if (next.kind === "people" && next.people.length < chosen.length) {
      setFocused("add")
      setRemovals((count) => count + 1)
    } else {
      setFocused("row")
    }
    onChange(next)
  }

  return (
    <div aria-labelledby={props.labelId} className="newcase-group" role="group">
      <p className="newcase-label" id={props.labelId}>
        Vem gäller det?
      </p>
      {about.kind === "unit" ? (
        <ul aria-labelledby={props.labelId} className="case-person-rows">
          <PersonRow
            action={{
              isFocusedOnMount: focused === "row",
              label: "Byt",
              onPress: () => {
                change({ kind: "people", people: [] })
              },
            }}
            isBusy={false}
            unitNumber={about.unitNumber}
          />
        </ul>
      ) : (
        <>
          {chosen.length > 0 && (
            <ChosenPeople
              chosen={chosen}
              focusRequest={focused === "add" ? removals : undefined}
              isFocusedOnMount={focused === "row"}
              isOffered={isOffered}
              labelId={props.labelId}
              nobodyText={nobodyText}
              onAdd={(person) => {
                change({ kind: "people", people: [...chosen, person] })
              }}
              onRemove={(memberNo) => {
                change({
                  kind: "people",
                  people: chosen.filter((other) => other.memberNo !== memberNo),
                })
              }}
              people={people}
            />
          )}
          {chosen.length === 0 && (
            <PersonPicker
              isFocusedOnMount={focused === "picker"}
              isOffered={isOffered}
              labelId={props.labelId}
              nobodyText={nobodyText}
              onPick={(person) => {
                change({ kind: "people", people: [person] })
              }}
              onPickUnit={(unit) => {
                change({ kind: "unit", unitNumber: unit })
              }}
              units={units}
            />
          )}
        </>
      )}
    </div>
  )
}

/**
 * The people chosen, who else may be, and what adding and taking one off do.
 */
interface ChosenPeopleProps {
  /**
   * The people chosen, in the order they were, whom the search for more leaves out.
   */
  readonly chosen: readonly Person[]
  /**
   * Asks for focus on the way to add someone, changed each time it is asked again – after
   * someone was taken off, whose row held it. Undefined while nothing asks.
   */
  readonly focusRequest: number | undefined
  /**
   * Whether a row that mounts takes focus – the one just added, or the one that took the
   * search's place.
   */
  readonly isFocusedOnMount: boolean
  /**
   * Whether a person may be chosen at all, as the case's scope says.
   */
  readonly isOffered: ((person: Person) => boolean) | undefined
  /**
   * The id of the question's eyebrow, which names the list.
   */
  readonly labelId: string
  /**
   * What the search for more says when nobody offered has the name typed.
   */
  readonly nobodyText: string | undefined
  /**
   * Adds the person chosen.
   */
  readonly onAdd: (person: Person) => void
  /**
   * Takes one of them off, by member number.
   */
  readonly onRemove: (memberNo: string) => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * The people a new case is about, a row each, and the way to add someone more beside the
 * last of them – a toggle that opens a search under the list and closes it again, as the
 * case's own sharing does, and which leaves out those already chosen. One person is
 * changed rather than taken away – no danger ink, since nothing is lost but the choice –
 * and one of several is taken off the list.
 * @param props The people, who else may be, and what adding and taking one off do.
 * @returns The list, and the search for more while it is open.
 */
function ChosenPeople(props: ChosenPeopleProps): ReactElement {
  const { chosen, focusRequest, isOffered } = props
  const searchId = useId()
  const [isAdding, setIsAdding] = useState(false)
  const list = useRef<HTMLUListElement>(null)
  const isOfferedMore = useMemo(() => {
    const taken = new Set(chosen.map((person) => person.memberNo))
    return (candidate: Person): boolean =>
      !taken.has(candidate.memberNo) && (isOffered === undefined || isOffered(candidate))
  }, [chosen, isOffered])

  // The way to add someone takes focus back from a row taken off, which held it.
  useEffect(() => {
    if (focusRequest !== undefined) {
      list.current?.querySelector<HTMLButtonElement>(":scope .newcase-more button")?.focus()
    }
  }, [focusRequest])

  const isOne = chosen.length === 1
  const last = chosen.at(-1)?.memberNo
  return (
    <>
      <ul aria-labelledby={props.labelId} className="case-person-rows" ref={list}>
        {chosen.map((person) => (
          <PersonRow
            action={{
              isFocusedOnMount: props.isFocusedOnMount,
              isTaking: !isOne,
              label: isOne ? "Byt" : "Ta bort",
              onPress: () => {
                props.onRemove(person.memberNo)
              },
            }}
            isBusy={false}
            key={person.memberNo}
            memberNo={person.memberNo}
            people={props.people}
            trailing={
              person.memberNo === last ? (
                <span className="newcase-more">
                  <Button
                    isExpanded={isAdding}
                    label="Lägg till"
                    onPress={() => {
                      setIsAdding(!isAdding)
                    }}
                    variant="secondary"
                  />
                </span>
              ) : undefined
            }
          />
        ))}
      </ul>
      {isAdding && (
        <>
          {/* Named for assistive technology alone, since the button that opened the
              search says enough on screen. */}
          <span className="newcase-hidden" id={searchId}>
            Lägg till person
          </span>
          <PersonPicker
            isFocusedOnMount
            isOffered={isOfferedMore}
            labelId={searchId}
            nobodyText={props.nobodyText}
            onPick={(person) => {
              setIsAdding(false)
              props.onAdd(person)
            }}
          />
        </>
      )}
    </>
  )
}
