import { Card, VirtualList } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Case } from "../../../model/Case"
import type { People } from "../../../model/Person"
import { CaseRow } from "../caserow/CaseRow"

/**
 * What a row is guessed to measure before it has been drawn – three lines of text. The
 * list measures each row once drawn, so one that says who follows it up only starts off
 * short.
 */
const estimatedRowHeight = 92

/**
 * The cases, their names, the heading, and what each row shows.
 */
export interface CaseListProps {
  /**
   * The cases the list holds, in the order they are listed.
   */
  readonly cases: readonly Case[]
  /**
   * Whether each row names who its case is about – true unless every case is about the
   * person the page is already about, where only a case about several people names them.
   */
  readonly isAboutShown?: boolean
  /**
   * Whether the title heads the card. Left off where the list is the screen's only one
   * and its control already names it, so the title is only the list's spoken name.
   */
  readonly isTitleShown?: boolean
  /**
   * Everyone the cases can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The list's heading, over the card, and its name for assistive technology.
   */
  readonly title: string
}

/**
 * A list of cases as rows on a card under a heading,
 * virtualized, because a season of follow-ups runs long.
 * @param props The cases, their names, and the heading.
 * @returns The card.
 */
export function CaseList(props: CaseListProps): ReactElement {
  const { people } = props
  const isAboutShown = props.isAboutShown ?? true

  return (
    <Card {...(props.isTitleShown !== false && { title: props.title })}>
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
