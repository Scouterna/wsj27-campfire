import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import type { LinkTarget } from "../../routing/routes"

import "./Fab.css"

export type FabProps = {
  /**
   * The glyph in the circle – one of the stroke icons, drawn white.
   */
  readonly icon: ReactElement
  /**
   * The control's accessible name – the icon is all a sighted reader sees, so the
   * name carries the words.
   */
  readonly label: string
} & (
  | {
      /**
       * Not with `onPress` – the button does one thing.
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
       * Not with `link` – the button does one thing.
       */
      readonly onPress?: never
    }
)

/**
 * The floating action button: a page's one primary action as a filled circle in the
 * theme's ink, floating over the content at phone width – the same declared action
 * the desktop heading draws as its button. Where it floats is the application's
 * stylesheet's decision, like every other piece of chrome placement.
 *
 * @param props The icon, the accessible name, and what pressing does or where it
 * leads.
 * @returns The control.
 */
export function Fab(props: FabProps): ReactElement {
  if (props.link !== undefined) {
    return (
      <Link
        aria-label={props.label}
        className="fab"
        to={props.link.to}
        params={props.link.params ?? {}}
      >
        <span aria-hidden="true" className="fab-icon">
          {props.icon}
        </span>
      </Link>
    )
  }

  return (
    <button aria-label={props.label} className="fab" onClick={props.onPress} type="button">
      <span aria-hidden="true" className="fab-icon">
        {props.icon}
      </span>
    </button>
  )
}
