import type { ReactElement } from "react"

import "./Button.css"

export type ButtonProps = {
  /**
   * Whether the action is unavailable – a pending navigation, for one.
   */
  readonly disabled?: boolean
  /**
   * The word or two on the control.
   */
  readonly label: string
  /**
   * What pressing it does.
   */
  readonly onPress: () => void
}

/**
 * The primary action: a full-width pill filled in the theme's ink.
 *
 * @param props The label, what pressing it does, and whether it is available.
 * @returns The control.
 */
export function Button(props: ButtonProps): ReactElement {
  return (
    <button className="button" disabled={props.disabled} onClick={props.onPress} type="button">
      {props.label}
    </button>
  )
}
