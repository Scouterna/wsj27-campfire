import { useId, type ReactElement } from "react"

import "./ChoiceGroup.css"

/**
 * One choice a `ChoiceGroup` offers.
 */
export interface ChoiceGroupOption<T extends string> {
  /**
   * What choosing it means, in a sentence under its label. Left out, the label stands
   * alone.
   */
  readonly description?: string
  /**
   * The word or two that names the choice.
   */
  readonly label: string
  /**
   * What `onChange` reports when it is chosen, unique within the group.
   */
  readonly value: T
}

/**
 * The choices, the one in force, and what choosing does.
 */
export interface ChoiceGroupProps<T extends string> {
  /**
   * The id of the element that names the group – the question the choices answer.
   */
  readonly labelledBy: string
  /**
   * How the choices stand: in a column, each with room for its sentence, or side by side
   * for a few short labels that need none. A column when left out; a row wraps to more
   * lines where the labels do not fit.
   */
  readonly layout?: "column" | "row"
  /**
   * Fires with the chosen value.
   */
  readonly onChange: (value: T) => void
  /**
   * The choices, in the order they are offered.
   */
  readonly options: readonly ChoiceGroupOption<T>[]
  /**
   * The value in force, or undefined while nothing is chosen.
   */
  readonly value: T | undefined
}

/**
 * A choice of one among a few, each with a sentence saying what it means – for a choice
 * the reader should read before making, where a segmented control would hide the
 * consequence. The platform's radio buttons, so the arrow keys move between the choices
 * and assistive technology announces them as one group.
 * @param props The choices, the one in force, and what choosing does.
 * @returns The group.
 */
export function ChoiceGroup<T extends string>(props: ChoiceGroupProps<T>): ReactElement {
  const name = useId()

  return (
    <div
      aria-labelledby={props.labelledBy}
      className={props.layout === "row" ? "choices choices-row" : "choices"}
      role="radiogroup"
    >
      {props.options.map((option) => (
        <label className="choice" key={option.value}>
          <input
            checked={option.value === props.value}
            className="choice-input"
            name={name}
            onChange={() => {
              props.onChange(option.value)
            }}
            type="radio"
            value={option.value}
          />
          <span className="choice-text">
            <strong>{option.label}</strong>
            {option.description !== undefined && <small>{option.description}</small>}
          </span>
        </label>
      ))}
    </div>
  )
}
