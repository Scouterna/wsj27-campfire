import { PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import "./FaqStatus.css"

export interface FaqStatusProps {
  /**
   * What the reader can do about it, such as asking again. Left out when there is
   * nothing to do.
   */
  readonly action?: ReactNode
  /**
   * What the screen has to say in place of the FAQ.
   */
  readonly message: string
  /**
   * The screen's title, or undefined where the status sits under one the screen
   * already shows.
   */
  readonly title?: string
}

/**
 * What an FAQ screen says in place of answers it does not have – the FAQ on its way, a
 * read that failed, a folder that is not there, a search that found nothing – announced
 * as a status.
 * @param props The title, the message, and the action.
 * @returns The screen's content.
 */
export function FaqStatus(props: FaqStatusProps): ReactElement {
  return (
    <>
      {props.title === undefined ? null : <PageTitle title={props.title} />}
      <p className="faq-status" role="status">
        {props.message}
      </p>
      {props.action}
    </>
  )
}
