import {
  Button,
  expectPop,
  PageTitle,
  setNavDirection,
  useUnitIdentities,
} from "@scouterna/wsj27-campfire-ui"
import { useQuery } from "@tanstack/react-query"
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"
import { useCallback, useId, useState, type ReactElement } from "react"

import { fetchPeopleQuery } from "../../../data/fetch-people"
import { placingLine, type Person } from "../../../model/Person"
import { PersonMark } from "../../components/personmark/PersonMark"
import { useCreateCase } from "./use-create-case"
import { usePeopleSearch, type PeopleSearchView } from "./use-people-search"

import "./NewCaseScreen.css"

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

interface PersonPickerProps {
  /**
   * The id of the text that names the picker, which labels the search field.
   */
  readonly labelId: string
  /**
   * Fires with the person chosen, or undefined when the reader asks to choose again.
   */
  readonly onPick: (person: Person | undefined) => void
  /**
   * The person chosen, once there is one.
   */
  readonly picked: Person | undefined
}

/**
 * Who the case is about: the chosen person with a way to change them, or a search over
 * the whole contingent with the matches as rows to choose from.
 * @param props The chosen person, and what choosing does.
 * @returns The picker.
 */
function PersonPicker(props: PersonPickerProps): ReactElement {
  const [query, setQuery] = useState("")
  const [isChanging, setIsChanging] = useState(false)
  const search = usePeopleSearch(query)
  const identities = useUnitIdentities()
  const { onPick, picked } = props

  // Choosing replaces the focused row with the chosen person, and Byt replaces itself
  // with the search, so focus follows to what took its place rather than falling to the
  // page. Stable, so a render while typing never moves focus again.
  const focusOnMount = useCallback((node: HTMLElement | null) => {
    node?.focus()
  }, [])
  const focusSearchOnMount = useCallback(
    (node: HTMLInputElement | null) => {
      if (isChanging) {
        node?.focus()
      }
    },
    [isChanging],
  )

  if (picked !== undefined) {
    const placing = placingLine(picked, identities.name)
    return (
      <div className="newcase-picked">
        <PersonMark name={picked.name} person={picked} />
        <span className="newcase-person">
          <strong>{picked.name}</strong>
          {placing !== undefined && <small>{placing}</small>}
        </span>
        <button
          aria-label={`Byt från ${picked.name}`}
          className="newcase-change"
          onClick={() => {
            setIsChanging(true)
            onPick(undefined)
          }}
          ref={focusOnMount}
          type="button"
        >
          Byt
        </button>
      </div>
    )
  }

  const count = countOf(search, query)
  return (
    <div className="newcase-results">
      <div className="newcase-search">
        <input
          aria-labelledby={props.labelId}
          autoComplete="off"
          className="newcase-search-field"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder="Sök namn"
          enterKeyHint="search"
          ref={focusSearchOnMount}
          type="text"
          value={query}
        />
        <small className="newcase-count" role="status">
          {count}
        </small>
      </div>

      {search.error !== null && (
        <p className="newcase-failed" role="alert">
          Kontingenten kunde inte hämtas.
          <Button label="Försök igen" onPress={search.refetch} variant="plain" />
        </p>
      )}

      {query.trim() !== "" && !search.isPending && search.error === null && search.total === 0 && (
        <p className="newcase-none">Ingen heter så.</p>
      )}

      {search.matches.length > 0 && (
        <ul className="newcase-options">
          {search.matches.map((person) => {
            const placing = placingLine(person, identities.name)
            return (
              <li key={person.memberNo}>
                <button
                  className="newcase-option"
                  onClick={() => {
                    onPick(person)
                  }}
                  type="button"
                >
                  <PersonMark name={person.name} person={person} />
                  <span className="newcase-person">
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

export interface NewCaseScreenProps {
  /**
   * The person to have chosen already, by member number – from their own screen's menu.
   * Left out, the form starts with the search.
   */
  readonly memberNo?: string
}

/**
 * The form for a new case, on one card: who it is about and its title – nothing more, so
 * a case is opened the moment it is needed. The reader lands on it in place of the form,
 * so back leads to the list rather than to a form already sent.
 * @param props The person to have chosen already, if any.
 * @returns The screen.
 */
export function NewCaseScreen(props: NewCaseScreenProps): ReactElement {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { create, hasFailed, isPending } = useCreateCase()
  const { data: people } = useQuery(fetchPeopleQuery())
  const [picked, setPicked] = useState<Person | undefined>(undefined)
  // The person the address names stays chosen until the reader changes them, and
  // arrives with the names rather than being copied into state before they have.
  const [isPresetDropped, setIsPresetDropped] = useState(false)
  const preset =
    props.memberNo === undefined || isPresetDropped ? undefined : people?.get(props.memberNo)
  const person = picked ?? preset
  const setPerson = (next: Person | undefined): void => {
    setIsPresetDropped(true)
    setPicked(next)
  }
  const [title, setTitle] = useState("")
  const id = useId()

  const isComplete = person !== undefined && title.trim() !== ""

  // Canceling is going back, not onward, so it returns to wherever the form was opened
  // from – the list, a person, or a case – and leaves no form behind in the history. A
  // form opened from a shared address has nowhere to go back to, so it is replaced by the
  // list instead.
  const cancel = (): void => {
    setNavDirection("back")
    if (canGoBack) {
      expectPop()
      router.history.back()
      return
    }
    void navigate({ replace: true, to: "/cases" })
  }

  const submit = (): void => {
    if (person === undefined) {
      return
    }
    create({ person, title: title.trim() }, (created) => {
      void navigate({ params: { caseId: created.id }, replace: true, to: "/cases/$caseId" })
    })
  }

  return (
    <>
      <PageTitle title="Nytt ärende" />

      <section aria-label="Nytt ärende" className="card newcase-form">
        <div aria-labelledby={`${id}-who`} className="newcase-group" role="group">
          <p className="newcase-label" id={`${id}-who`}>
            Vem gäller det?
          </p>
          <PersonPicker labelId={`${id}-who`} onPick={setPerson} picked={person} />
        </div>

        <div className="newcase-group">
          <label className="newcase-label" htmlFor={`${id}-title`}>
            Rubrik
          </label>
          <input
            autoComplete="off"
            className="newcase-input"
            id={`${id}-title`}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
            placeholder="Kort beskrivning"
            value={title}
          />
        </div>

        {hasFailed && (
          <p className="newcase-failure" role="alert">
            Ärendet kunde inte skapas. Försök igen.
          </p>
        )}

        <div className="newcase-actions">
          <button className="newcase-cancel" onClick={cancel} type="button">
            Avbryt
          </button>
          <Button disabled={!isComplete || isPending} label="Skapa ärende" onPress={submit} />
        </div>
      </section>
    </>
  )
}
