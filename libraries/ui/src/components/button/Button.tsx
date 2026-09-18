import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import type { LinkTarget } from "../../routing/routes"

import "./Button.css"

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
 * The primary action: a full-width pill filled in the theme's ink. With `onPress` it is
 * a button; with `link` it is the same pill as a real link to the address it names.
 *
 * @param props The label, and what pressing it does or where it leads.
 * @returns The control.
 */
export function Button(props: ButtonProps): ReactElement {
  if (props.link !== undefined) {
    return (
      <Link className="button" to={props.link.to} params={props.link.params ?? {}}>
        {props.label}
      </Link>
    )
  }

  return (
    <button className="button" disabled={props.disabled} onClick={props.onPress} type="button">
      {props.label}
    </button>
  )
}
