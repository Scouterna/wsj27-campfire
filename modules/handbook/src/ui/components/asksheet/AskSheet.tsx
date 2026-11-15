import { Button, Card, ChatIcon, CheckIcon, MailIcon, Sheet } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"

import { discordGuideSlug, leaderQuestionsAddress, replyTime } from "../../../model/asking"
import { supportAddress, supportMail } from "../../../model/Faq"
import { useHandbook } from "../../use-handbook"

import "./AskSheet.css"

export type AskSheetProps = {
  /**
   * Whether the sheet is showing.
   */
  readonly isOpen: boolean
  /**
   * What closing does – the sheet does not close itself.
   */
  readonly onClose: () => void
  /**
   * The subject a mail starts with, saying where the reader was when they asked.
   */
  readonly subject: string
}

/**
 * Where to ask what the handbook and the FAQ do not answer, and what to expect there:
 * the Ledarfrågor forum on Discord first, with the answer time that holds today and the
 * forum's own rules, and a mail to the contingent management for a question about the
 * reader themself.
 * @param props Whether it shows, what closing does, and the mail's subject.
 * @returns The sheet.
 */
export function AskSheet(props: AskSheetProps): ReactElement | null {
  // The guide is the handbook's own page, so the hint shows only while the handbook has it.
  const { chapters } = useHandbook()
  const hasGuide = chapters.some((entry) =>
    entry.pages.some((page) => page.slug === discordGuideSlug),
  )

  return (
    <Sheet
      description="Sök i handboken först – svaret kan redan finnas där."
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Ställ en fråga"
    >
      <div className="ask-sheet">
        <Card>
          <section className="ask-way" aria-labelledby="ask-forum">
            <div className="ask-head">
              <span className="ask-tile" aria-hidden="true">
                <ChatIcon size={22} />
              </span>
              <h3 id="ask-forum">Ledarfrågor på Discord</h3>
            </div>
            <p>Om förberedelserna, resan och lägret. Avdelningssupport bevakar forumet.</p>
            <p className="ask-time">{replyTime(new Date())}</p>
            <Button href={leaderQuestionsAddress} label="Öppna Ledarfrågor" />
            {hasGuide ? (
              <p className="ask-note">
                Inte med på Discord än?{" "}
                <Link
                  hash={discordGuideSlug}
                  onClick={props.onClose}
                  params={{ chapter: discordGuideSlug }}
                  to="/handbook/$chapter"
                >
                  Så kommer du igång
                </Link>
              </p>
            ) : null}
          </section>

          <section className="ask-rules" aria-labelledby="ask-rules">
            <h3 id="ask-rules">Så fungerar forumet</h3>
            <ul>
              <Rule>En fråga per inlägg, med en rubrik som går att söka på.</Rule>
              <Rule>Följdfrågor skriver du i inläggets tråd.</Rule>
              <Rule>Märkt Besvarad av CMT betyder att svaret gäller.</Rule>
            </ul>
          </section>
        </Card>

        <Card>
          <section className="ask-way" aria-labelledby="ask-self">
            <div className="ask-head">
              <span className="ask-tile" aria-hidden="true">
                <MailIcon size={22} />
              </span>
              <h3 id="ask-self">Gäller det dig själv?</h3>
            </div>
            <p>
              Anmälan, betalning och hälsa hör inte hemma i forumet. Mejla kontingentledningen på{" "}
              {supportAddress}.
            </p>
            <Button
              href={supportMail(props.subject)}
              label="Mejla kontingentledningen"
              variant="secondary"
            />
          </section>
        </Card>
      </div>
    </Sheet>
  )
}

type RuleProps = {
  /**
   * The rule, in a sentence.
   */
  readonly children: string
}

/**
 * One of the forum's rules, behind a check in the theme's ink.
 * @param props The rule.
 * @returns The item.
 */
function Rule(props: RuleProps): ReactElement {
  return (
    <li>
      <CheckIcon size={16} strokeWidth={2.4} />
      <span>{props.children}</span>
    </li>
  )
}
