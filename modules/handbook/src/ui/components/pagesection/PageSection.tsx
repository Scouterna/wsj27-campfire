import { Card, PencilIcon } from "@scouterna/wsj27-campfire-ui"
import { useState, type ReactElement } from "react"

import {
  isIntroduction,
  lastChangeOn,
  type ChapterEntry,
  type HandbookPage,
} from "../../../model/Handbook"
import { changedOn } from "../../changed-on"
import { useCanEdit } from "../../use-editor-menu"
import { ChangeBadge } from "../changebadge/ChangeBadge"
import { EditLink } from "../editlink/EditLink"
import { RichText } from "../richtext/RichText"

import "./PageSection.css"

export type PageSectionProps = {
  /**
   * The chapter the page is in.
   */
  readonly entry: ChapterEntry
  /**
   * The level of the page's own heading, where the chapter's name is a heading above it
   * on the same screen rather than the screen's title. An `h2` without one.
   */
  readonly level?: 2 | 3
  /**
   * The moment the page's change is aged against.
   */
  readonly now: Date
  /**
   * The page to draw as a card.
   */
  readonly page: HandbookPage
}

/**
 * One page as a card of its chapter, its title the card's heading, anchored by its slug,
 * and dated beside the title when it changed – the date opening the editor's note at the
 * top of the card, when they wrote one. A page that only repeats its chapter's name is the
 * chapter's introduction, and its card carries no heading.
 * @param props The page, its chapter, and the moment its change is aged against.
 * @returns The card.
 */
export function PageSection(props: PageSectionProps): ReactElement {
  const isOpening = isIntroduction(props.page, props.entry)
  // An introduction has no heading of its own, so its content's headings stand where the
  // page's would, and otherwise one level under it.
  const level = props.level ?? 2
  const inner = level === 2 ? 3 : 4
  const canEdit = useCanEdit()
  const [isNoteOpen, setNoteOpen] = useState(false)
  const change = props.page.change
  const changedAt = lastChangeOn(props.page)
  const noteId = `${props.page.slug}-change`

  const content = (
    <>
      {change === undefined ? null : (
        <div className="handbook-change-note" hidden={!isNoteOpen} id={noteId}>
          <PencilIcon size={16} strokeWidth={2.2} />
          <p>
            <small>Ändrat {changedOn(change.at)}</small>
            {change.text}
          </p>
        </div>
      )}
      <RichText blocks={props.page.content} headingLevel={isOpening ? level : inner} />
    </>
  )
  const aside =
    changedAt !== undefined || canEdit ? (
      <span className="handbook-section-aside">
        {changedAt === undefined ? null : (
          <ChangeBadge
            at={changedAt}
            isOpen={isNoteOpen}
            label="Uppdaterad"
            now={props.now}
            {...(change !== undefined && {
              controls: noteId,
              onToggle: () => {
                setNoteOpen((isOpen) => !isOpen)
              },
            })}
          />
        )}
        <EditLink page={props.page} />
      </span>
    ) : undefined

  // What sits on the heading row sits above an introduction's card, which has none.
  return (
    <div className="handbook-section" id={props.page.slug}>
      {isOpening ? (
        <>
          {aside === undefined ? null : <div className="handbook-section-row">{aside}</div>}
          <Card>{content}</Card>
        </>
      ) : (
        <Card aside={aside} level={level} title={props.page.title}>
          {content}
        </Card>
      )}
    </div>
  )
}
