import type { ReactElement } from "react"

import { BackIcon } from "../../foundations/icons/set/BackIcon"

import "./Select.css"

/**
 * One choice a `Select` offers.
 */
export interface SelectOption<T extends string> {
  /**
   * The word or two that names the choice.
   */
  readonly label: string
  /**
   * What `onChange` reports when it is chosen, unique within the select.
   */
  readonly value: T
}

/**
 * How a select stands among the controls beside it: filled in the theme's wash as a pill
 * of its own, or plain – its answer and chevron alone – where the actions around it should
 * carry the weight.
 */
export type SelectVariant = "filled" | "plain"

/**
 * The choices, the one in force, and what choosing does.
 */
export interface SelectProps<T extends string> {
  /**
   * What the select is called for assistive technology – the question its choices answer,
   * since the pill shows only the answer.
   */
  readonly label: string
  /**
   * Fires with the chosen value.
   */
  readonly onChange: (value: T) => void
  /**
   * The choices, in the order they are offered.
   */
  readonly options: readonly SelectOption<T>[]
  /**
   * The value in force.
   */
  readonly value: T
  /**
   * How it stands among the controls beside it, filled by default.
   */
  readonly variant?: SelectVariant | undefined
}

/**
 * A choice of one among a few, closed to a pill that shows the one in force – for a setting
 * changed now and then beside the action it belongs to, where a row of choices would
 * outweigh the action. The platform's own select, so a phone opens its native picker.
 * @param props The choices, the one in force, and what choosing does.
 * @returns The select.
 */
export function Select<T extends string>(props: SelectProps<T>): ReactElement {
  return (
    <span className={props.variant === "plain" ? "select select-plain" : "select"}>
      <select
        aria-label={props.label}
        className="select-field"
        onChange={(event) => {
          const chosen = props.options.find((option) => option.value === event.target.value)
          if (chosen !== undefined) {
            props.onChange(chosen.value)
          }
        }}
        value={props.value}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="select-chevron">
        <BackIcon size={14} strokeWidth={2.4} />
      </span>
    </span>
  )
}
