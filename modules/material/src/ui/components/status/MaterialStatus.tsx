import { PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import "./MaterialStatus.css"

export interface MaterialStatusProps {
  /**
   * What the reader can do about it, such as asking again. Left out when there is
   * nothing to do.
   */
  readonly action?: ReactNode
  /**
   * What the screen has to say in place of the material.
   */
  readonly message: string
  /**
   * The screen's title, or undefined where the status sits under one the screen
   * already shows.
   */
  readonly title?: string
}

/**
 * What a material screen says in place of material it does not have – the material on
 * its way, a read that failed, a folder that is not there or is empty, a search that
 * found nothing – announced as a status.
 * @param props The title, the message, and the action.
 * @returns The screen's content.
 */
export function MaterialStatus(props: MaterialStatusProps): ReactElement {
  return (
    <>
      {props.title === undefined ? null : <PageTitle title={props.title} />}
      <p className="material-status" role="status">
        {props.message}
      </p>
      {props.action}
    </>
  )
}
