import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import type { LinkTarget } from "../../routing/routes"

import "./Button.css"

/**
 * How loudly a button asks to be pressed: primary for the action a reader takes every
 * time, filled in the theme's ink and filling its row, secondary for one they take now
 * and then, in the menu trigger's glass and hugging its label, and plain for the way back
 * beside a primary, its label alone in the theme's ink.
 */
export type ButtonVariant = "plain" | "primary" | "secondary"

export type ButtonProps = {
  /**
   * Whether the action is unavailable – a pending navigation, for one. Only a pressed
   * button can be unavailable; a link either exists or is not rendered.
   */
  readonly disabled?: boolean
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
 * @param props The label, the variant, and what pressing it does or where it leads.
 * @returns A button, or a router link when `link` is given.
 */
export function Button(props: ButtonProps): ReactElement {
  const variant = props.variant ?? "primary"
  const className = variant === "primary" ? "button" : `button button-${variant}`

  if (props.link !== undefined) {
    return (
      <Link className={className} to={props.link.to} params={props.link.params ?? {}}>
        {props.label}
      </Link>
    )
  }

  return (
    <button className={className} disabled={props.disabled} onClick={props.onPress} type="button">
      {props.label}
    </button>
  )
}
