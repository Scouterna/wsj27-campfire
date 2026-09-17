import type { ReactElement } from "react"

import { BackIcon } from "../../foundations/icons/set/BackIcon"
import { Button } from "../button/Button"
import { OverflowMenu, type OverflowMenuItem } from "../overflowmenu/OverflowMenu"

import "./PageHeading.css"

export interface PageHeadingProps {
  /**
   * What the screen is called – the page's one `h1`.
   */
  readonly title: string
  /**
   * The back control: where back leads in words, and what going back does. The caller
   * owns the history; the heading only asks.
   */
  readonly back?: { readonly label: string; readonly onBack: () => void } | undefined
  /**
   * The page's one primary action, on the title row. Desktop only – a phone's actions
   * live in the bar and the content.
   */
  readonly action?: { readonly label: string; readonly onPress: () => void } | undefined
  /**
   * The page's extra actions, as the overflow menu on the title row. On a phone the
   * chrome places the same menu in the bar instead, so the consumer's stylesheet hides
   * this one there.
   */
  readonly menu?: readonly OverflowMenuItem[] | undefined
}

/**
 * The page's heading: the eyebrow back control over the title, and the title row's
 * trailing actions. It scrolls with the page – large on every width – while the
 * condensed bar takes over once it is out of sight.
 *
 * @param props The title, the back control, and the row's actions.
 * @returns The heading, carrying the page's one `h1`.
 */
export function PageHeading(props: PageHeadingProps): ReactElement {
  return (
    <div className="pageheading">
      {props.back ? (
        <button type="button" className="eyebrow" onClick={props.back.onBack}>
          <BackIcon size={15} strokeWidth={2.3} />
          {props.back.label}
        </button>
      ) : null}
      <div className="pageheading-row">
        <h1>{props.title}</h1>
        {props.action ? <Button label={props.action.label} onPress={props.action.onPress} /> : null}
        {props.menu ? <OverflowMenu items={props.menu} /> : null}
      </div>
    </div>
  )
}
