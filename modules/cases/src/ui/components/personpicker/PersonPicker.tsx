import { Button, unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useRef, useState, type ReactElement } from "react"

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
  if (search.total > search.matches.length) {
    return `${String(search.matches.length)} av ${String(search.total)}`
  }
  return search.total === 1 ? "1 träff" : `${String(search.total)} träffar`
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
   * The chosen person, or undefined while nobody is – a picker that adds people to a list
   * leaves it undefined, so it stays a search.
   */
  readonly picked: Person | undefined
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
  const search = usePeopleSearch(query, props.isOffered)
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
          placeholder="Sök namn"
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

      {query.trim() !== "" && !search.isPending && search.error === null && search.total === 0 && (
        <p className="person-picker-none">{props.nobodyText ?? "Ingen heter så."}</p>
      )}

      {search.matches.length > 0 && (
        <ul className="person-picker-options">
          {search.matches.map((person) => {
            const placing = placingLine(person, unitName)
            return (
              <li key={person.memberNo}>
                <button
                  className="person-picker-option"
                  onClick={() => {
                    onPick(person)
                    // A picker that adds to a list stays a search, so it starts over and
                    // keeps focus for the next name rather than losing it with the row.
                    setQuery("")
                    field.current?.focus()
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
      )}
    </div>
  )
}
