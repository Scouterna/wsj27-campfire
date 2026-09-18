import type { ReactElement } from "react"

import "./IconField.css"

export interface IconFieldProps {
  /**
   * Where the value leads – a `mailto:` or `tel:` address that wraps the value in a
   * link. Without it the value is plain text.
   */
  readonly href?: string
  /**
   * The glyph in the leading tile – one of the design system's stroke icons, left
   * unsized so the tile decides how big it is drawn.
   */
  readonly icon: ReactElement
  /**
   * The field's name, drawn above the value.
   */
  readonly label: string
  /**
   * What the field says when there is no value. "Ej angiven" by default.
   */
  readonly missingLabel?: string
  /**
   * The field's value. Left out, the field draws the missing state rather than an
   * empty line, so a record that holds nothing says so.
   */
  readonly value?: string
}

/**
 * One labeled fact with a leading icon: the tile, the field's name, and the value –
 * as a link where the value is something to open, and as a quiet "Ej angiven" where
 * there is no value at all.
 *
 * @param props The icon, the field's name, and the value with where it leads.
 * @returns The field.
 */
export function IconField(props: IconFieldProps): ReactElement {
  const isMissing = props.value === undefined

  return (
    <div className={isMissing ? "icon-field icon-field-missing" : "icon-field"}>
      <span className="icon-field-tile" aria-hidden="true">
        {props.icon}
      </span>
      <span className="icon-field-text">
        <small>{props.label}</small>
        {fieldValue(props)}
      </span>
    </div>
  )
}

/**
 * The line under the field's name: a link where the value opens something, the value on
 * its own where it does not, and the missing note where there is no value.
 * @param props The field's value, where it leads, and what absence says.
 * @returns The value line.
 */
function fieldValue(props: IconFieldProps): ReactElement {
  if (props.value === undefined) {
    return <em>{props.missingLabel ?? "Ej angiven"}</em>
  }

  if (props.href === undefined) {
    return <strong>{props.value}</strong>
  }

  return <a href={props.href}>{props.value}</a>
}
