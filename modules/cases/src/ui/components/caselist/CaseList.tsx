import { Card, formatRowMoment, Row, VirtualList } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { aboutName, type Case } from "../../../model/Case"
import { nameOf, unitTag, type People } from "../../../model/Person"
import { PersonMark } from "../personmark/PersonMark"

import "./CaseList.css"

/**
 * What a row is guessed to measure before it has been drawn – three lines of text.
 */
const estimatedRowHeight = 92

interface CaseRowProps {
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
   * Everyone the case can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * One case in a list – a doorway into it: the case's title, then who it is about and their
 * unit where the page does not already say, who opened it, and when at the row's end.
 * @param props The case, and the names to show it with.
 * @returns The row.
 */
function CaseRow(props: CaseRowProps): ReactElement {
  const { item, people } = props
  const about = item.aboutMemberNo === undefined ? undefined : people?.get(item.aboutMemberNo)
  const name = aboutName(item, people)
  const unit = unitTag(about)

  return (
    <Row
      className="case-row"
      leading={<PersonMark name={name} person={about} />}
      link={{ params: { caseId: item.id }, to: "/cases/$caseId" }}
      trailing={
        <time className="case-row-time" dateTime={item.createdAt.toISOString()}>
          {formatRowMoment(item.createdAt)}
        </time>
      }
    >
      <strong>{item.title}</strong>
      {props.isAboutShown ? (
        <span className="case-row-about">{unit === undefined ? name : `${name} · ${unit}`}</span>
      ) : null}
      <small>Skapat av {nameOf(people, item.creatorMemberNo)}</small>
    </Row>
  )
}

export interface CaseListProps {
  /**
   * The cases the list holds, newest first.
   */
  readonly cases: readonly Case[]
  /**
   * Whether each row names who its case is about – true unless every case is about the
   * one person the page is already about.
   */
  readonly isAboutShown?: boolean
  /**
   * Everyone the cases can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The list's heading, over the card.
   */
  readonly title: string
}

/**
 * A list of cases – the open ones or the closed ones – as rows on a card under a heading,
 * virtualized, because a season of follow-ups runs long.
 * @param props The cases, their names, and the heading.
 * @returns The card.
 */
export function CaseList(props: CaseListProps): ReactElement {
  const { people } = props
  const isAboutShown = props.isAboutShown ?? true

  return (
    <Card title={props.title}>
      <VirtualList
        estimatedRowHeight={estimatedRowHeight}
        items={props.cases}
        keyOf={(item) => item.id}
        label={props.title}
        renderRow={(item) => <CaseRow isAboutShown={isAboutShown} item={item} people={people} />}
      />
    </Card>
  )
}
