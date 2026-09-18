import type { ReactElement } from "react"

import { MailIcon } from "../../foundations/icons/set/MailIcon"
import { PhoneIcon } from "../../foundations/icons/set/PhoneIcon"

import "./ContactCard.css"

export interface ContactCardProps {
  /**
   * The one round action at the end of the card: a call or an email, with the `tel:`
   * or `mailto:` address it opens. Left out where there is no way to reach the person
   * at all.
   */
  readonly action?: {
    /**
     * Which way the action reaches them, which decides both the glyph and the verb in
     * its accessible name.
     */
    readonly kind: "call" | "mail"
    /**
     * The address the action opens.
     */
    readonly href: string
  }
  /**
   * The line under the name – the ways to reach them, already joined.
   */
  readonly detail?: string
  /**
   * The person's name.
   */
  readonly name: string
  /**
   * The small uppercase line naming who this person is.
   */
  readonly overline: string
}

/**
 * Someone to reach on another person's behalf: an overline naming who they are, the
 * name, the ways to reach them, and one round action that does it.
 *
 * @param props Who the person is, how they read, and the action that reaches them.
 * @returns The card.
 */
export function ContactCard(props: ContactCardProps): ReactElement {
  return (
    <div className="contact-card">
      <span className="contact-card-text">
        <small>{props.overline}</small>
        <strong>{props.name}</strong>
        {props.detail === undefined ? null : <span>{props.detail}</span>}
      </span>
      {props.action === undefined ? null : (
        <a
          aria-label={`${props.action.kind === "call" ? "Ring" : "Mejla"} ${props.name}`}
          className="contact-card-action"
          href={props.action.href}
        >
          {props.action.kind === "call" ? <PhoneIcon /> : <MailIcon />}
        </a>
      )}
    </div>
  )
}
