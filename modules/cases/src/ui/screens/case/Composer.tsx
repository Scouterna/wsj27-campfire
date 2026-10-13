import { Button, Select, type SelectOption } from "@scouterna/wsj27-campfire-ui"
import { useId, useState, type ReactElement } from "react"

import type { CaseScope } from "../../../model/CaseType"
import { isSecrecyLevel, noteAudience, type SecrecyLevel } from "../../../model/SecrecyLevel"

import "./Composer.css"

export interface ComposerProps {
  /**
   * The case's own level, which a note takes unless the writer chooses a higher one.
   */
  readonly caseLevel: SecrecyLevel
  /**
   * Whether a write is under way, which holds the button still.
   */
  readonly isBusy: boolean
  /**
   * The levels the writer may choose from, the case's own first. With only that one, the
   * choice is not offered.
   */
  readonly levels: readonly SecrecyLevel[]
  /**
   * Writes the note – at the chosen level when it is above the case's, undefined at the
   * case's own – then calls `onAdded` so the field can be emptied.
   */
  readonly onAdd: (text: string, level: SecrecyLevel | undefined, onAdded: () => void) => void
  /**
   * The case's scope, which names whose role a level 4 note is for.
   */
  readonly scope: CaseScope
}

/**
 * The field a new note is written in, and the button that adds it to the case beside who
 * reads it, where the writer may choose. The choice stays as it was after a note is added,
 * because a writer keeping a run of notes to themselves would otherwise have to remember
 * to ask again each time, and the one they forgot would be read by everyone.
 * @param props The levels on offer, and what adding does.
 * @returns The card.
 */
export function Composer(props: ComposerProps): ReactElement {
  const [draft, setDraft] = useState("")
  const [level, setLevel] = useState<SecrecyLevel>(props.caseLevel)
  const id = useId()
  const options: readonly SelectOption<string>[] = props.levels.map((candidate) => ({
    label: noteAudience(candidate, props.caseLevel, props.scope),
    value: String(candidate),
  }))

  return (
    <section aria-labelledby={id} className="card case-compose">
      <label className="case-compose-label" htmlFor={`${id}-field`} id={id}>
        Ny anteckning
      </label>
      <textarea
        className="case-compose-field"
        id={`${id}-field`}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        placeholder="Skriv en anteckning…"
        rows={2}
        value={draft}
      />
      <div className="case-compose-actions">
        {options.length > 1 && (
          <Select
            label="Vem ser anteckningen?"
            onChange={(value) => {
              const next = Number(value)
              if (isSecrecyLevel(next)) {
                setLevel(next)
              }
            }}
            options={options}
            value={String(level)}
          />
        )}
        <Button
          disabled={draft.trim() === "" || props.isBusy}
          label="Lägg till anteckning"
          onPress={() => {
            props.onAdd(draft.trim(), level === props.caseLevel ? undefined : level, () => {
              setDraft("")
            })
          }}
        />
      </div>
    </section>
  )
}
