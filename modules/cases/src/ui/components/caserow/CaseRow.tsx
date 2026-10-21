import { formatRowMoment, Row } from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement, ReactNode } from "react"

import { aboutName, scopeOf, type Case } from "../../../model/Case"
import { scopeName } from "../../../model/CaseType"
import { nameOf, unitTag, type People } from "../../../model/Person"
import { PersonMark } from "../personmark/PersonMark"

import "./CaseRow.css"

export interface CaseRowProps {
  /**
   * A control at the row's end, pressed on its own rather than opening the case.
   */
  readonly action?: ReactNode
  /**
   * Whether the row names who the case is about. Left out on a list of one person's
   * cases, where the page already says who.
   */
  readonly isAboutShown: boolean
  /**
   * The case the row opens.
   */
  readonly item: Case
  /**
   * The moment at the row's end – when the case was opened unless the list orders by
   * something else.
   */
  readonly moment?: Date
  /**
   * Everyone the case can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * One case in a list – a doorway into it: the case's title, then who it is about and their
 * unit where the page does not already say, what kind of case it is and who opened it, and
 * when at the row's end. A private case is marked beside its title, as a funktionsansvarig
 * is beside their name, because it is the one level a reader opening it would not
 * otherwise expect.
 * @param props The case, and the names to show it with.
 * @returns The row.
 */
export function CaseRow(props: CaseRowProps): ReactElement {
  const { item, people } = props
  const about = item.aboutMemberNo === undefined ? undefined : people?.get(item.aboutMemberNo)
  const name = aboutName(item, people)
  const unit = unitTag(about)
  const reader = useUser()
  // Only its creator and those it is shared with see a private case, so to its creator it
  // is theirs alone, and to anyone else it is someone else's.
  let mark: string | undefined
  if (item.secrecyLevel === 5) {
    mark = item.creatorMemberNo === reader?.memberNo ? "Bara du" : "Privat"
  }

  return (
    <Row
      action={props.action}
      className="case-row"
      leading={<PersonMark name={name} person={about} />}
      link={{ params: { caseId: item.id }, to: "/cases/$caseId" }}
      trailing={
        <time className="case-row-time" dateTime={(props.moment ?? item.createdAt).toISOString()}>
          {formatRowMoment(props.moment ?? item.createdAt)}
        </time>
      }
    >
      <strong>
        {item.title}
        {/* A space before the mark, so a narrow row breaks the line there rather than
            pushing the mark past the column's end. */}
        {mark !== undefined && (
          <>
            {" "}
            <span className="case-row-mark">{mark}</span>
          </>
        )}
      </strong>
      {props.isAboutShown ? (
        <span className="case-row-about">{unit === undefined ? name : `${name} · ${unit}`}</span>
      ) : null}
      <small>
        {scopeName(scopeOf(item))} · Skapat av {nameOf(people, item.creatorMemberNo)}
      </small>
    </Row>
  )
}
