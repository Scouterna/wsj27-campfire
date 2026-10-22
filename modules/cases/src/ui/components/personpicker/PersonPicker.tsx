import { Button, UnitAvatar, unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useId, useRef, useState, type ReactElement } from "react"

import { placingLine, type Person } from "../../../model/Person"
import { PersonMark } from "../personmark/PersonMark"
import { usePeopleSearch, type PeopleSearchView } from "./use-people-search"

import "./PersonPicker.css"

/**
 * The line in the search's corner, whatever the search is doing, or nothing before
 * anything is typed or while the contingent could not be read, which the box says in a
 * line of its own.
 * @param search What the search found.
 * @param query What the reader typed.
 * @returns The words to announce.
 */
function countOf(search: PeopleSearchView, query: string): string {
  if (search.isPending) {
    return "Hämtar …"
  }
  if (search.error !== null || query.trim() === "") {
    return ""
  }
  const shown = search.units.length + search.matches.length
  const total = search.units.length + search.total
  if (total > shown) {
    return `${String(shown)} av ${String(total)}`
  }
  return total === 1 ? "1 träff" : `${String(total)} träffar`
}

interface PickedPersonProps {
  /**
   * Sets the person aside, so another can be chosen.
   */
  readonly onChange: () => void
  /**
   * The person chosen.
   */
  readonly person: Person
}

/**
 * The chosen person, with the way to choose another.
 * @param props The person, and what changing does.
 * @returns The row.
 */
function PickedPerson(props: PickedPersonProps): ReactElement {
  const placing = placingLine(props.person, unitName)

  // Choosing replaces the focused row with this one, so focus follows to it rather than
  // falling to the page.
  const focusOnMount = useCallback((node: HTMLElement | null) => {
    node?.focus()
  }, [])

  return (
    <div className="person-picker-picked">
      <PersonMark name={props.person.name} person={props.person} />
      <span className="person-picker-person">
        <strong>{props.person.name}</strong>
        {placing !== undefined && <small>{placing}</small>}
      </span>
      <button
        aria-label={`Byt från ${props.person.name}`}
        className="person-picker-change"
        onClick={props.onChange}
        ref={focusOnMount}
        type="button"
      >
        Byt
      </button>
    </div>
  )
}

interface UnitOptionsProps {
  /**
   * The id of the heading that names the list.
   */
  readonly labelId: string
  /**
   * Chooses one of them, as a whole.
   */
  readonly onPick: (unitNumber: number) => void
  /**
   * The units the search named.
   */
  readonly units: readonly number[]
}

/**
 * The units the search named, under a heading of their own ahead of the people, each a
 * row to choose the unit as a whole from.
 * @param props The units, and what choosing one does.
 * @returns The heading and the list.
 */
function UnitOptions(props: UnitOptionsProps): ReactElement {
  return (
    <>
      <p className="person-picker-section" id={props.labelId}>
        Avdelningar
      </p>
      <ul aria-labelledby={props.labelId} className="person-picker-options">
        {props.units.map((unit) => {
          const name = unitName(unit)
          return (
            <li key={unit}>
              <button
                className="person-picker-option"
                onClick={() => {
                  props.onPick(unit)
                }}
                type="button"
              >
                <UnitAvatar unitNumber={unit} />
                <span className="person-picker-person">
                  <strong>Avdelning {unit}</strong>
                  <small>
                    {name === undefined ? "Hela avdelningen" : `${name} · Hela avdelningen`}
                  </small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

interface PersonOptionsProps {
  /**
   * The id of the heading that sets the people apart from the units ahead of them,
   * undefined where no units were found.
   */
  readonly labelId: string | undefined
  /**
   * Chooses one of them.
   */
  readonly onPick: (person: Person) => void
  /**
   * The people the search found.
   */
  readonly people: readonly Person[]
}

/**
 * The people the search found, each a row to choose from – under a heading of their own
 * where units were found ahead of them.
 * @param props The people, and what choosing one does.
 * @returns The list.
 */
function PersonOptions(props: PersonOptionsProps): ReactElement {
  return (
    <>
      {props.labelId !== undefined && (
        <p className="person-picker-section" id={props.labelId}>
          Personer
        </p>
      )}
      <ul aria-labelledby={props.labelId} className="person-picker-options">
        {props.people.map((person) => {
          const placing = placingLine(person, unitName)
          return (
            <li key={person.memberNo}>
              <button
                className="person-picker-option"
                onClick={() => {
                  props.onPick(person)
                }}
                type="button"
              >
                <PersonMark name={person.name} person={person} />
                <span className="person-picker-person">
                  <strong>{person.name}</strong>
                  {placing !== undefined && <small>{placing}</small>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export interface PersonPickerProps {
  /**
   * The id of the text that names the picker, which labels the search field.
   */
  readonly labelId: string
  /**
   * Fires with the person chosen, or undefined when the reader asks to choose again.
   */
  readonly onPick: (person: Person | undefined) => void
  /**
   * Whether a person may be chosen at all – for a unit's case, someone in the unit. Left
   * out, everyone within the reader's reach may. Kept stable across renders, because the
   * matches are recomputed whenever it changes.
   */
  readonly isOffered?: ((person: Person) => boolean) | undefined
  /**
   * What the box says when nobody offered has the name typed. "Ingen heter så." when left
   * out.
   */
  readonly nobodyText?: string | undefined
  /**
   * Fires with a unit chosen as a whole, from among `units`.
   */
  readonly onPickUnit?: ((unitNumber: number) => void) | undefined
  /**
   * The chosen person, or undefined while nobody is – a picker that adds people to a list
   * leaves it undefined, so it stays a search.
   */
  readonly picked: Person | undefined
  /**
   * The units that may be chosen as a whole, lowest first, found by their exact number or
   * their name and shown ahead of the people. Left out, none may.
   */
  readonly units?: readonly number[] | undefined
}

/**
 * A person to choose: the chosen one with a way to change them, or a search over everyone
 * who may be chosen, with the matches as rows to choose from.
 * @param props The chosen person, what choosing does, and who may be chosen.
 * @returns The picker.
 */
export function PersonPicker(props: PersonPickerProps): ReactElement {
  const [query, setQuery] = useState("")
  const [isChanging, setIsChanging] = useState(false)
  const field = useRef<HTMLInputElement | null>(null)
  const search = usePeopleSearch(query, props.isOffered, props.units)
  const id = useId()
  const { onPickUnit } = props
  const { onPick, picked } = props

  // Byt replaces itself with the search, so focus follows to what took its place rather
  // than falling to the page. Stable, so a render while typing never moves focus again.
  const focusSearchOnMount = useCallback(
    (node: HTMLInputElement | null) => {
      field.current = node
      if (isChanging) {
        node?.focus()
      }
    },
    [isChanging],
  )

  if (picked !== undefined) {
    return (
      <PickedPerson
        onChange={() => {
          setIsChanging(true)
          onPick(undefined)
        }}
        person={picked}
      />
    )
  }

  const count = countOf(search, query)
  return (
    <div className="person-picker-results">
      <div className="person-picker-search">
        <input
          aria-labelledby={props.labelId}
          autoComplete="off"
          className="person-picker-search-field"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={props.units === undefined ? "Sök namn" : "Sök namn eller avdelning"}
          enterKeyHint="search"
          ref={focusSearchOnMount}
          type="text"
          value={query}
        />
        <small className="person-picker-count" role="status">
          {count}
        </small>
      </div>

      {search.error !== null && (
        <p className="person-picker-failed" role="alert">
          Kontingenten kunde inte hämtas.
          <Button label="Försök igen" onPress={search.refetch} variant="plain" />
        </p>
      )}

      {query.trim() !== "" &&
        !search.isPending &&
        search.error === null &&
        search.total === 0 &&
        search.units.length === 0 && (
          <p className="person-picker-none">{props.nobodyText ?? "Ingen heter så."}</p>
        )}

      {onPickUnit !== undefined && search.units.length > 0 && (
        <UnitOptions labelId={`${id}-units`} onPick={onPickUnit} units={search.units} />
      )}

      {search.matches.length > 0 && (
        <PersonOptions
          labelId={search.units.length > 0 ? `${id}-people` : undefined}
          onPick={(person) => {
            onPick(person)
            // A picker that adds to a list stays a search, so it starts over and keeps
            // focus for the next name rather than losing it with the row.
            setQuery("")
            field.current?.focus()
          }}
          people={search.matches}
        />
      )}
    </div>
  )
}
