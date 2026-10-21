import {
  Button,
  ChoiceGroup,
  expectPop,
  PageTitle,
  setNavDirection,
  type ChoiceGroupOption,
} from "@scouterna/wsj27-campfire-ui"
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"
import { useId, useMemo, useState, type ReactElement } from "react"

import { canBeAbout, scopeName, type CaseScope } from "../../../model/CaseType"
import type { Person } from "../../../model/Person"
import {
  defaultSecrecyLevel,
  isSecrecyLevel,
  levelChoice,
  levelsFor,
  type SecrecyLevel,
} from "../../../model/SecrecyLevel"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { usePeople } from "../../use-people"
import { useCaseScopes, type CaseScopesView } from "./use-case-scopes"
import { useCreateCase } from "./use-create-case"

import "./NewCaseScreen.css"

/**
 * A scope as a choice group carries it – the type, and a unit's number after a colon.
 * @param scope The scope.
 * @returns The key, unique among the scopes a reader is offered.
 */
function scopeKey(scope: CaseScope): string {
  return scope.unitNumber === undefined ? scope.type : `${scope.type}:${String(scope.unitNumber)}`
}

interface ScopeQuestionProps {
  /**
   * The id the question's eyebrow carries, which names the choices.
   */
  readonly labelId: string
  /**
   * Fires with the chosen scope's key.
   */
  readonly onChange: (key: string) => void
  /**
   * The scopes on offer, and the states they are in.
   */
  readonly offered: CaseScopesView
  /**
   * The chosen scope, undefined while none is.
   */
  readonly scope: CaseScope | undefined
}

/**
 * What kind of case it is: the kinds side by side to choose from – each named alone, since
 * the levels under them say whose role each reaches – or nothing at all where there is
 * only one, because there is nothing to ask and the levels already name its group. While
 * the kinds are on their way or could not be read, the line the question says instead.
 * @param props The scopes, the one chosen, and what choosing does.
 * @returns The question, or nothing for a single kind.
 */
function ScopeQuestion(props: ScopeQuestionProps): ReactElement | null {
  const { offered } = props
  const options: readonly ChoiceGroupOption<string>[] = offered.scopes.map((candidate) => ({
    label: scopeName(candidate),
    value: scopeKey(candidate),
  }))
  if (offered.scopes.length === 1) {
    return null
  }

  return (
    <div className="newcase-group">
      <p className="newcase-label" id={props.labelId}>
        Typ av ärende
      </p>
      {offered.isPending && (
        <p className="newcase-status" role="status">
          Hämtar …
        </p>
      )}
      {offered.error !== null && (
        <p className="newcase-status" role="alert">
          Det gick inte att se vilka ärenden du kan skapa.
          <Button label="Försök igen" onPress={offered.refetch} variant="plain" />
        </p>
      )}
      {options.length > 1 && (
        <ChoiceGroup
          labelledBy={props.labelId}
          layout="row"
          onChange={props.onChange}
          options={options}
          value={props.scope === undefined ? undefined : scopeKey(props.scope)}
        />
      )}
    </div>
  )
}

interface PersonQuestionProps {
  /**
   * The id the question's eyebrow carries, which names the search.
   */
  readonly labelId: string
  /**
   * Fires with the person chosen, or undefined when the reader asks to choose again.
   */
  readonly onPick: (person: Person | undefined) => void
  /**
   * The person chosen, once there is one.
   */
  readonly person: Person | undefined
  /**
   * The case's scope, which decides who it can be about. Undefined while none is chosen,
   * when anyone within reach may be.
   */
  readonly scope: CaseScope | undefined
}

/**
 * Who the case is about: a person within the reader's reach, and for a unit's case one of
 * the unit's deltagare.
 * @param props The person chosen, what choosing does, and the scope to keep to.
 * @returns The question.
 */
function PersonQuestion(props: PersonQuestionProps): ReactElement {
  const { scope } = props
  const unitNumber = scope?.unitNumber
  const isOffered = useMemo(
    () =>
      scope === undefined
        ? undefined
        : (candidate: Person): boolean => canBeAbout(scope, candidate),
    [scope],
  )

  return (
    <div aria-labelledby={props.labelId} className="newcase-group" role="group">
      <p className="newcase-label" id={props.labelId}>
        Vem gäller det?
      </p>
      <PersonPicker
        isOffered={isOffered}
        labelId={props.labelId}
        nobodyText={
          unitNumber === undefined
            ? undefined
            : `Ingen deltagare i avdelning ${String(unitNumber)} heter så.`
        }
        onPick={props.onPick}
        picked={props.person}
      />
    </div>
  )
}

interface LevelQuestionProps {
  /**
   * The id the question's eyebrow carries, which names the choices.
   */
  readonly labelId: string
  /**
   * The level chosen.
   */
  readonly level: SecrecyLevel
  /**
   * Fires with the chosen level.
   */
  readonly onChange: (level: SecrecyLevel) => void
  /**
   * The case's scope, which names who each level reaches.
   */
  readonly scope: CaseScope
}

/**
 * Who sees the case: each level said in the scope's own words.
 * @param props The scope, the level chosen, and what choosing does.
 * @returns The question.
 */
function LevelQuestion(props: LevelQuestionProps): ReactElement {
  const options: readonly ChoiceGroupOption<string>[] = levelsFor(props.scope).map((candidate) => {
    const choice = levelChoice(candidate, props.scope)
    return { description: choice.description, label: choice.title, value: String(candidate) }
  })

  return (
    <div className="newcase-group">
      <p className="newcase-label" id={props.labelId}>
        Vem ser ärendet?
      </p>
      <ChoiceGroup
        labelledBy={props.labelId}
        onChange={(value) => {
          const next = Number(value)
          if (isSecrecyLevel(next)) {
            props.onChange(next)
          }
        }}
        options={options}
        value={String(props.level)}
      />
    </div>
  )
}

interface AccessQuestionsProps {
  /**
   * What the questions' ids start with, unique on the page.
   */
  readonly idPrefix: string
  /**
   * The level chosen.
   */
  readonly level: SecrecyLevel
  /**
   * The scopes on offer, and the states they are in.
   */
  readonly offered: CaseScopesView
  /**
   * Fires with the chosen level.
   */
  readonly onLevel: (level: SecrecyLevel) => void
  /**
   * Fires with the chosen scope's key.
   */
  readonly onScope: (key: string) => void
  /**
   * The chosen scope, undefined while none is.
   */
  readonly scope: CaseScope | undefined
}

/**
 * What kind of case it is and who sees it, set apart by space with the one fact that
 * holds for both – neither changes once the case exists. Who sees it is asked once the
 * kind is known, because its choices are said in the kind's own words.
 * @param props The scopes, the level, and what choosing each does.
 * @returns The questions.
 */
function AccessQuestions(props: AccessQuestionsProps): ReactElement {
  return (
    <div className="newcase-access">
      <ScopeQuestion
        labelId={`${props.idPrefix}-kind`}
        offered={props.offered}
        onChange={props.onScope}
        scope={props.scope}
      />

      {props.scope !== undefined && (
        <LevelQuestion
          labelId={`${props.idPrefix}-level`}
          level={props.level}
          onChange={props.onLevel}
          scope={props.scope}
        />
      )}

      <p className="newcase-fixed">
        {props.offered.scopes.length === 1
          ? "Vem som ser ärendet går inte att ändra när ärendet är skapat."
          : "Typen och vem som ser ärendet går inte att ändra när ärendet är skapat."}
      </p>
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
 * The form for a new case, on one card: who it is about and its title, then – together,
 * because they decide one thing – what kind of case it is and who sees it. The kind is
 * asked outright rather than defaulted where there is a choice, because neither can be
 * changed once the case exists, and a case filed with the wrong people cannot be taken
 * back from them. The reader lands on the case in place of the form, so back leads to the
 * list rather than to a form already sent.
 * @param props The person to have chosen already, if any.
 * @returns The screen.
 */
export function NewCaseScreen(props: NewCaseScreenProps): ReactElement {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { create, hasFailed, isPending } = useCreateCase()
  const { data: people } = usePeople()
  const offered = useCaseScopes()
  const [chosenScope, setChosenScope] = useState<string | undefined>(undefined)
  const [level, setLevel] = useState<SecrecyLevel>(defaultSecrecyLevel)
  const [picked, setPicked] = useState<Person | undefined>(undefined)
  // The person the address names stays chosen until the reader changes them, and
  // arrives with the names rather than being copied into state before they have.
  const [isPresetDropped, setIsPresetDropped] = useState(false)
  const [title, setTitle] = useState("")
  const id = useId()

  // A single scope is the only answer there is, so it is chosen; with more, the reader
  // chooses.
  const onlyScope = offered.scopes.length === 1 ? offered.scopes[0] : undefined
  const scope = onlyScope ?? offered.scopes.find((candidate) => scopeKey(candidate) === chosenScope)

  const preset =
    props.memberNo === undefined || isPresetDropped ? undefined : people?.get(props.memberNo)
  const chosen = picked ?? preset
  // Someone the scope does not offer – a leader, or someone outside the unit, for a unit's
  // case – is set aside rather than kept, whether they came with the address or were
  // chosen before the scope changed.
  const isNotOffered = chosen !== undefined && scope !== undefined && !canBeAbout(scope, chosen)
  const person = isNotOffered ? undefined : chosen
  const setPerson = (next: Person | undefined): void => {
    setIsPresetDropped(true)
    setPicked(next)
  }

  // A level chosen for one scope and not offered for the one chosen since falls back to
  // the default, so no case is ever sent at a level the reader was not shown.
  const offeredLevel =
    scope === undefined || levelsFor(scope).includes(level) ? level : defaultSecrecyLevel

  const isComplete = scope !== undefined && person !== undefined && title.trim() !== ""

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
    if (scope === undefined || person === undefined) {
      return
    }
    create({ level: offeredLevel, person, scope, title: title.trim() }, (created) => {
      void navigate({ params: { caseId: created.id }, replace: true, to: "/cases/$caseId" })
    })
  }

  return (
    <>
      <PageTitle title="Nytt ärende" />

      <section aria-label="Nytt ärende" className="card newcase-form">
        <PersonQuestion labelId={`${id}-who`} onPick={setPerson} person={person} scope={scope} />

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

        <AccessQuestions
          idPrefix={id}
          level={offeredLevel}
          offered={offered}
          onLevel={setLevel}
          onScope={setChosenScope}
          scope={scope}
        />

        {hasFailed && (
          <p className="newcase-failure" role="alert">
            Ärendet kunde inte skapas. Försök igen.
          </p>
        )}

        <div className="newcase-actions">
          <Button label="Avbryt" onPress={cancel} variant="plain" />
          <Button disabled={!isComplete || isPending} label="Skapa ärende" onPress={submit} />
        </div>
      </section>
    </>
  )
}
