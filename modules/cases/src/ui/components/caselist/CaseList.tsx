import { Card, VirtualList } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Case } from "../../../model/Case"
import type { People } from "../../../model/Person"
import { CaseRow } from "../caserow/CaseRow"

/**
 * What a row is guessed to measure before it has been drawn – three lines of text.
 */
const estimatedRowHeight = 92

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
