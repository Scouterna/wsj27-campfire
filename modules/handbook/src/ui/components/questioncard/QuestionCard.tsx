import { Card } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { datedOf, newsOf, type FaqQuestion } from "../../../model/Faq"
import { freshSince } from "../../../model/Handbook"
import { ChangeBadge } from "../changebadge/ChangeBadge"
import { RichText } from "../richtext/RichText"

import "./QuestionCard.css"

export type QuestionCardProps = {
  /**
   * The moment the question's date is aged against.
   */
  readonly now: Date
  /**
   * The question, with its answer.
   */
  readonly question: FaqQuestion
}

/**
 * One question of the FAQ as a card: the question its heading, dated – marked while it
 * is new or changed – with its answer under it, anchored by the question's id.
 * @param props The question, and the moment its date is aged against.
 * @returns The card.
 */
export function QuestionCard(props: QuestionCardProps): ReactElement {
  const { now, question } = props
  return (
    <div className="handbook-faq-question" id={String(question.id)}>
      <Card aside={newsBadge(question, freshSince(now), now)} title={question.title}>
        <RichText blocks={question.answer} headingLevel={3} />
      </Card>
    </div>
  )
}

/**
 * What a question's card says beside its title: that it is new or changed, while that is
 * news, and otherwise when it was published or last saved.
 * @param question The question.
 * @param since The moment after which a change is news, as an ISO 8601 instant.
 * @param now The moment the badge is aged against.
 * @returns The badge, or undefined for a question the help center sent no moments for.
 */
function newsBadge(question: FaqQuestion, since: string, now: Date): ReactElement | undefined {
  const news = newsOf(question, since)
  if (news !== undefined) {
    return <ChangeBadge at={news.at} label={news.kind === "new" ? "Ny" : "Uppdaterad"} now={now} />
  }
  // Older than news, the question is still dated, without the tint – published, or last
  // saved – so the reader can judge how current the answer is.
  const dated = datedOf(question)
  if (dated === undefined) {
    return undefined
  }
  return (
    <ChangeBadge
      at={dated.at}
      label={dated.kind === "new" ? "Publicerad" : "Uppdaterad"}
      now={now}
    />
  )
}
