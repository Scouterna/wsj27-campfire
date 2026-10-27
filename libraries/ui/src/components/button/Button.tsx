import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import { BackIcon } from "../../foundations/icons/set/BackIcon"
import { linkPropsOf, type LinkTarget } from "../../routing/routes"

import "./Button.css"

/**
 * How loudly a button asks to be pressed: primary for the action a reader takes every
 * time, filled in the theme's ink and filling its row, secondary for one they take now
 * and then, hugging its label in the menu trigger's glass – or on a card, the theme's
 * wash – and plain for the way back beside a primary, its label alone in the theme's
 * ink.
 */
export type ButtonVariant = "plain" | "primary" | "secondary"

export type ButtonProps = {
  /**
   * Whether the action is unavailable – a pending navigation, for one. Only a pressed
   * button can be unavailable; a link either exists or is not rendered.
   */
  readonly disabled?: boolean
  /**
   * An icon before the label, for an action a picture says faster than its words.
   */
  readonly icon?: ReactNode
  /**
   * Whether what the button opens in place is open, for a button that opens and closes a
   * panel under it. Given, the button says so to assistive technology and wears a chevron
   * that turns with it, so the button stays where it is while the panel comes and goes.
   */
  readonly isExpanded?: boolean | undefined
  /**
   * The word or two on the control.
   */
  readonly label: string
  /**
   * How loudly the button asks to be pressed, primary by default.
   */
  readonly variant?: ButtonVariant
} & (
  | {
      /**
       * Not with `onPress` – a button does one thing.
       */
      readonly link?: never
      /**
       * What pressing it does.
       */
      readonly onPress: () => void
    }
  | {
      /**
       * Where the button leads. Rendered as a real link, so the router – and the
       * reader's middle click – treat it as the navigation it is.
       */
      readonly link: LinkTarget
      /**
       * Not with `link` – a button does one thing.
       */
      readonly onPress?: never
    }
)

/**
 * A labeled action as a pill. With `onPress` it is a button; with `link` it is the same
 * pill as a real link to the address it names.
 *
 * @param props The label and its icon, the variant, and what pressing it does or where it
 * leads.
 * @returns A button, or a router link when `link` is given.
 */
export function Button(props: ButtonProps): ReactElement {
  const variant = props.variant ?? "primary"
  const className = variant === "primary" ? "button" : `button button-${variant}`

  if (props.link !== undefined) {
    return (
      <Link className={className} {...linkPropsOf(props.link)}>
        {props.icon}
        {props.label}
      </Link>
    )
  }

  return (
    <button
      aria-expanded={props.isExpanded}
      className={className}
      disabled={props.disabled}
      onClick={props.onPress}
      type="button"
    >
      {props.icon}
      {props.label}
      {props.isExpanded === undefined ? null : (
        <span aria-hidden="true" className="button-chevron">
          <BackIcon size={14} strokeWidth={2.4} />
        </span>
      )}
    </button>
  )
}
