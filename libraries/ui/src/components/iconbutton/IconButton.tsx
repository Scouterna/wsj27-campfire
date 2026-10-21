import type { ReactElement } from "react"

import "./IconButton.css"

/**
 * How loudly an icon button asks to be pressed: primary for the action the row exists
 * for, filled in the theme's ink, and secondary for a tool beside it, in the theme's wash.
 */
export type IconButtonVariant = "primary" | "secondary"

export interface IconButtonProps {
  /**
   * Whether the action is unavailable now.
   */
  readonly disabled?: boolean
  /**
   * The glyph in the circle – one of the stroke icons.
   */
  readonly icon: ReactElement
  /**
   * The control's accessible name – the icon is all a sighted reader sees, so the name
   * carries the words.
   */
  readonly label: string
  /**
   * What pressing it does.
   */
  readonly onPress: () => void
  /**
   * How loudly it asks to be pressed, secondary by default.
   */
  readonly variant?: IconButtonVariant
}

/**
 * An action drawn as its icon alone, in a circle a thumb can hit – for a row of tools
 * where words would crowd each other out.
 * @param props The icon, the accessible name, and what pressing does.
 * @returns The button.
 */
export function IconButton(props: IconButtonProps): ReactElement {
  const variant = props.variant ?? "secondary"
  return (
    <button
      aria-label={props.label}
      className={`icon-button icon-button-${variant}`}
      disabled={props.disabled}
      onClick={props.onPress}
      title={props.label}
      type="button"
    >
      {props.icon}
    </button>
  )
}
