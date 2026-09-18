import type { ReactElement } from "react"

import "./FieldList.css"

/**
 * One row of the list: what was asked, what was answered, and – where the answer was a
 * choice the person then explained – their own words under it.
 */
export interface FieldRow {
  /**
   * The field's name.
   */
  readonly label: string
  /**
   * The indented quoted line under the value – the person's own words, drawn with
   * quotation marks.
   */
  readonly quote?: string
  /**
   * The field's value.
   */
  readonly value: string
}

export interface FieldListProps {
  /**
   * The rows, each a label and its value, in the order they read.
   */
  readonly fields: readonly FieldRow[]
}

/**
 * A record's fields as a label-value grid: one column on a phone, as many as fit on a
 * wider surface, with the quoted line kept under the value it belongs to.
 *
 * @param props The rows to draw.
 * @returns The list.
 */
export function FieldList(props: FieldListProps): ReactElement {
  return (
    <dl className="fields">
      {props.fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
          {field.quote === undefined ? null : (
            <dd className="field-quote">
              <q>{field.quote}</q>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}
