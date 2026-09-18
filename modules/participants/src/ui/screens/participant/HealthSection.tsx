import {
  Callout,
  Card,
  ChatIcon,
  Chip,
  FieldList,
  type FieldRow,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import {
  diagnosisName,
  equipmentNeedName,
  isUnremarkable,
  mobilityAidName,
  type HealthProfile,
} from "../../../model/HealthProfile"
import { audienceName, type Note } from "../../../model/Note"

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
 * What was declared about medication, as rows.
 * @param health The health profile to read.
 * @returns The rows, or none where nothing was declared.
 */
function medicationRows(health: HealthProfile): readonly FieldRow[] {
  const medication = health.medication
  if (medication === undefined) {
    return []
  }
  const rows: FieldRow[] = [{ label: "Receptbelagda läkemedel", value: medication.details }]
  if (medication.managesOwn !== undefined) {
    rows.push({
      label: "Tar själv ansvar för medicinering",
      value: medication.managesOwn ? "Ja" : "Nej",
    })
  }
  if (medication.storage !== undefined) {
    rows.push({ label: "Särskild förvaring", value: medication.storage })
  }
  return rows
}

/**
 * What was declared about moving around: the aids named, with the limitation quoted under
 * them – or the limitation on its own where no aid was named.
 * @param health The health profile to read.
 * @returns The row, or none where nothing was declared.
 */
function mobilityRows(health: HealthProfile): readonly FieldRow[] {
  const mobility = health.mobility
  if (mobility === undefined) {
    return []
  }
  const aids = [
    ...mobility.aids.map((aid) => mobilityAidName(aid)),
    ...(mobility.otherAids === undefined ? [] : [mobility.otherAids]),
  ].join(", ")

  // Declared but nothing to show: a "Ja" whose follow-ups are all blank is absence,
  // not an empty row.
  if (aids === "" && mobility.limitations === undefined) {
    return []
  }
  if (aids === "") {
    return [{ label: "Hjälpmedel", value: mobility.limitations ?? "" }]
  }
  return [
    {
      label: "Hjälpmedel",
      value: aids,
      ...(mobility.limitations !== undefined && { quote: mobility.limitations }),
    },
  ]
}

/**
 * What was declared about the mind, and about the support that goes with it.
 * @param health The health profile to read.
 * @returns The rows, in the order the design reads them.
 */
function mindRows(health: HealthProfile): readonly FieldRow[] {
  const rows: FieldRow[] = []

  if (health.mind?.phobia !== undefined) {
    rows.push({ label: "Fobi", value: health.mind.phobia })
  }
  if (health.mind?.diagnoses !== undefined) {
    rows.push({
      label: "Diagnos eller kognitiv funktionsnedsättning",
      value: health.mind.diagnoses.kinds.map((kind) => diagnosisName(kind)).join(", "),
      ...(health.mind.diagnoses.details !== undefined && {
        quote: health.mind.diagnoses.details,
      }),
    })
  }
  if (health.mind?.condition !== undefined) {
    rows.push({ label: "Ångest, ätstörning eller PTSD", value: health.mind.condition })
  }
  if (health.support?.personalAssistant === true) {
    rows.push({ label: "Personlig assistent", value: "Ja" })
  }
  if (health.support?.unpredictability !== undefined) {
    rows.push({
      label: "Reagerar på oregelbundna måltider m.m.",
      value: health.support.unpredictability.wantsSupport ? "Ja – vill ha stöttning" : "Ja",
      ...(health.support.unpredictability.details !== undefined && {
        quote: health.support.unpredictability.details,
      }),
    })
  }

  return rows
}

/**
 * What was declared about medical equipment. A "Ja" whose follow-ups are all blank is
 * absence rather than an empty row, and a details-only declaration carries the details
 * as its value.
 * @param health The health profile to read.
 * @returns The row, or none where nothing was declared.
 */
function equipmentRows(health: HealthProfile): readonly FieldRow[] {
  const equipment = health.equipment
  if (equipment === undefined) {
    return []
  }
  const needs = equipment.needs.map((need) => equipmentNeedName(need)).join(", ")
  if (needs === "" && equipment.details === undefined) {
    return []
  }
  if (needs === "") {
    return [{ label: "Medicinsk utrustning", value: equipment.details ?? "" }]
  }
  return [
    {
      label: "Medicinsk utrustning",
      value: needs,
      ...(equipment.details !== undefined && { quote: equipment.details }),
    },
  ]
}

/**
 * The label-value rows a health profile fills – only the facts that were declared, in the
 * order the design reads them.
 * @param health The health profile to read.
 * @returns The rows to draw.
 */
function healthRows(health: HealthProfile): readonly FieldRow[] {
  return [
    ...medicationRows(health),
    ...equipmentRows(health),
    ...mobilityRows(health),
    ...(health.condition === undefined ? [] : [{ label: "Sjukdom", value: health.condition }]),
    ...mindRows(health),
  ]
}

/**
 * Hälsa: the all-clear chip where the profile says nothing, the declared facts as rows
 * otherwise, and the catch-all notes as callouts either way. Nothing at all where there is
 * nothing to draw – absence reads the same whether the questions were never asked, never
 * answered, or are not the viewer's to read.
 * @param props The health profile, and what the person wrote in the catch-all questions.
 * @returns The card, or nothing.
 */
export function HealthSection(props: HealthSectionProps): ReactElement | null {
  const { health, notes } = props

  const rows = health === undefined ? [] : healthRows(health)
  const isAllClear = health !== undefined && isUnremarkable(health)

  if (!isAllClear && rows.length === 0 && notes.length === 0) {
    return null
  }

  return (
    <Card title="Hälsa">
      <div className="person-health">
        {isAllClear && (
          <div className="person-chips">
            <Chip>Inga hälsoanmärkningar</Chip>
          </div>
        )}
        {rows.length > 0 && <FieldList fields={rows} />}
        {notes.map((note) => (
          <Callout key={note.audience} icon={<ChatIcon />} title={audienceName(note.audience)}>
            <q>{note.text}</q>
          </Callout>
        ))}
      </div>
    </Card>
  )
}
