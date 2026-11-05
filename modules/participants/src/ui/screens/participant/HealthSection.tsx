import { Card, Chip, FieldList } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { isUnremarkable, type HealthProfile } from "../../../model/HealthProfile"
import type { Note } from "../../../model/Note"
import { NoteCallouts } from "../../components/notecallouts/NoteCallouts"
import { pageHealthRows } from "../../health-rows"

import "./HealthSection.css"

/**
 * The answers and the notes a `HealthSection` draws.
 */
export interface HealthSectionProps {
  /**
   * The health profile whose remarks to draw. Undefined where the answers are not the
   * viewer's to read – the notes can still stand on their own, so the section is handed
   * the absence rather than left out of the screen.
   */
  readonly health: HealthProfile | undefined
  /**
   * What the person wrote in the catch-all questions, each a callout addressed to
   * whoever the question named.
   */
  readonly notes: readonly Note[]
}

/**
 * Hälsa: the all-clear chip where the questions were answered and the profile says nothing,
 * a chip saying so where they were not, the declared facts as rows otherwise, and the
 * catch-all notes as callouts either way. Nothing at all where there is nothing to draw,
 * which is also what a reader sees where the answers are not theirs.
 * @param props The health profile, and what the person wrote in the catch-all questions.
 * @returns The card, or nothing.
 */
export function HealthSection(props: HealthSectionProps): ReactElement | null {
  const { health, notes } = props

  const rows = health === undefined ? [] : pageHealthRows(health)
  const isAllClear = health !== undefined && isUnremarkable(health)
  const isUnanswered = health !== undefined && health.isHealthAnswered !== true && rows.length === 0

  if (!isAllClear && !isUnanswered && rows.length === 0 && notes.length === 0) {
    return null
  }

  return (
    <Card title="Hälsa">
      <div className="person-health">
        {isAllClear && (
          <div>
            <Chip>Inga hälsoanmärkningar</Chip>
          </div>
        )}
        {isUnanswered && (
          <div>
            <Chip>Ej besvarad</Chip>
          </div>
        )}
        {rows.length > 0 && <FieldList fields={rows} />}
        <NoteCallouts notes={notes} />
      </div>
    </Card>
  )
}
