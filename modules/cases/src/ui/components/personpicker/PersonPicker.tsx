import { Button, UnitAvatar, unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useId, useRef, useState, type ReactElement } from "react"

import { placingLine, type Person } from "../../../model/Person"
import { useOwnUnit } from "../../use-people"
import { PersonMark } from "../personmark/PersonMark"
import { usePeopleSearch, type PeopleSearchView } from "./use-people-search"

import "./PersonPicker.css"

/**
 * The line in the search's corner, whatever the search is doing – how many are listed
 * before anything is typed, where everyone is – or nothing while the contingent could not
 * be read, which the box says in a line of its own.
 * @param search What the search found.
 * @param query What the reader typed.
 * @param isListed Whether everyone is listed before anything is typed.
 * @returns The words to announce.
 */
function countOf(search: PeopleSearchView, query: string, isListed: boolean): string {
  if (search.isPending) {
    return "Hämtar …"
  }
  if (search.error !== null) {
    return ""
  }
  if (query.trim() === "") {
    if (!isListed) {
      return ""
    }
    return search.total === 1 ? "1 person" : `${String(search.total)} personer`
  }
  const shown = search.units.length + search.matches.length
  const total = search.units.length + search.total
  if (total > shown) {
    return `${String(shown)} av ${String(total)}`
  }
  return total === 1 ? "1 träff" : `${String(total)} träffar`
}

interface UnitOptionsProps {
  /**
   * Whether a write is under way, which holds the rows still.
   */
  readonly isBusy: boolean
  /**
   * The id of the heading that sets the units apart from the people after them,
   * undefined where the units are a choice of their own that needs none.
   */
  readonly labelId: string | undefined
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
  const ownUnit = useOwnUnit()
  return (
    <>
      {props.labelId !== undefined && (
        <p className="person-picker-section" id={props.labelId}>
          Avdelningar
        </p>
      )}
      <ul aria-labelledby={props.labelId} className="person-picker-options">
        {props.units.map((unit) => {
          const name = unitName(unit)
          // The reader's own unit is the whole unit to them, with nothing more to say.
          const isOwn = unit === ownUnit
          return (
            <li key={unit}>
              <button
                className="person-picker-option"
                disabled={props.isBusy}
                onClick={() => {
                  props.onPick(unit)
                }}
                type="button"
              >
                <UnitAvatar unitNumber={unit} />
                <span className="person-picker-person">
                  <strong>{isOwn ? "Hela avdelningen" : `Avdelning ${String(unit)}`}</strong>
                  {!isOwn && (
                    <small>
                      {name === undefined ? "Hela avdelningen" : `${name} · Hela avdelningen`}
                    </small>
                  )}
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
   * Whether a write is under way, which holds the rows still.
   */
  readonly isBusy: boolean
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
  const ownUnit = useOwnUnit()
  return (
    <>
      {props.labelId !== undefined && (
        <p className="person-picker-section" id={props.labelId}>
          Personer
        </p>
      )}
      <ul aria-labelledby={props.labelId} className="person-picker-options">
        {props.people.map((person) => {
          const placing = placingLine(person, unitName, ownUnit)
          return (
            <li key={person.memberNo}>
              <button
                className="person-picker-option"
                disabled={props.isBusy}
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

/**
 * Who may be chosen, what choosing does, and how the search behaves.
 */
export interface PersonPickerProps {
  /**
   * Whether a write is under way, which holds the matches still, so a choice that
   * replaces a whole list is always built from a settled one. Left out, they never are.
   */
  readonly isBusy?: boolean | undefined
  /**
   * Whether the search takes focus as it appears – where it takes the place of the row
   * that held focus, which would otherwise drop it to the page.
   */
  readonly isFocusedOnMount?: boolean | undefined
  /**
   * Whether a person may be chosen at all – for a unit's case, someone in the unit. Left
   * out, everyone within the reader's reach may. Kept stable across renders, because the
   * matches are recomputed whenever it changes.
   */
  readonly isOffered?: ((person: Person) => boolean) | undefined
  /**
   * The id of the text that names the picker, which labels the search field.
   */
  readonly labelId: string
  /**
   * What the box says when nobody offered has the name typed. "Ingen heter så." when left
   * out.
   */
  readonly nobodyText?: string | undefined
  /**
   * Fires with the person chosen.
   */
  readonly onPick: (person: Person) => void
  /**
   * Fires with a unit chosen as a whole, from among `units`.
   */
  readonly onPickUnit?: ((unitNumber: number) => void) | undefined
  /**
   * The units that may be chosen as a whole, lowest first, found by their exact number or
   * their name and shown ahead of the people. Left out, none may.
   */
  readonly units?: readonly number[] | undefined
}

/**
 * A search over everyone who may be chosen, with the matches as rows to choose from. It
 * stays a search after a choice, starting over for the next name.
 * @param props What choosing does, and who may be chosen.
 * @returns The picker.
 */
export function PersonPicker(props: PersonPickerProps): ReactElement {
  const [query, setQuery] = useState("")
  const field = useRef<HTMLInputElement | null>(null)
  // A reader who leads one unit knows its people, so they are listed rather than searched
  // for, and the unit is a choice of its own rather than something a search turns up.
  const isListed = useOwnUnit() !== undefined
  const { onPickUnit } = props
  const search = usePeopleSearch(query, props.isOffered, props.units, isListed)
  const fixedUnits = isListed ? (props.units ?? []) : []
  const foundUnits = isListed ? [] : search.units
  // The people get a heading wherever a unit stands above them, found or fixed, so the two
  // kinds read apart. A fixed unit needs none of its own, since it is always there.
  const isPeopleHeaded =
    foundUnits.length > 0 || (onPickUnit !== undefined && fixedUnits.length > 0)
  const id = useId()
  const { onPick } = props
  const isBusy = props.isBusy === true
  // Read once, as the field mounts, so a later change never moves focus again.
  const [isFocusedOnMount] = useState(props.isFocusedOnMount === true)

  const focusSearchOnMount = useCallback(
    (node: HTMLInputElement | null) => {
      field.current = node
      if (isFocusedOnMount) {
        node?.focus()
      }
    },
    [isFocusedOnMount],
  )

  const count = countOf(search, query, isListed)
  return (
    <div className="person-picker-results">
      <div className="person-picker-search">
        <input
          aria-labelledby={props.labelId}
          autoComplete="off"
          className="person-picker-search-field"
          enterKeyHint="search"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={
            props.units === undefined || isListed ? "Sök namn" : "Sök namn eller avdelning"
          }
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

      {onPickUnit !== undefined && fixedUnits.length > 0 && (
        <UnitOptions isBusy={isBusy} labelId={undefined} onPick={onPickUnit} units={fixedUnits} />
      )}

      {onPickUnit !== undefined && foundUnits.length > 0 && (
        <UnitOptions
          isBusy={isBusy}
          labelId={`${id}-units`}
          onPick={onPickUnit}
          units={foundUnits}
        />
      )}

      {search.matches.length > 0 && (
        <PersonOptions
          isBusy={isBusy}
          labelId={isPeopleHeaded ? `${id}-people` : undefined}
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
