import { Button, PageActions, PageTitle } from "@scouterna/wsj27-campfire-ui"
import { useEffect, type ReactElement } from "react"

import { chapterAt } from "../../../model/Handbook"
import { HandbookOnward } from "../../components/handbookonward/HandbookOnward"
import { HandbookOutline } from "../../components/handbookoutline/HandbookOutline"
import { PageSection } from "../../components/pagesection/PageSection"
import { useFaq } from "../../use-faq"
import { useHandbook } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"
import { useReadingPage } from "../../use-reading-page"

import "./ChapterScreen.css"

export type ChapterScreenProps = {
  /**
   * The section to open at – a page's slug – or undefined for the chapter's top.
   */
  readonly section?: string
  /**
   * The chapter's slug, or a page's, which opens the page's chapter at the page.
   */
  readonly slug: string
}

/**
 * One chapter, read as one document: every page as a card of its own, and the chapters
 * either side of it.
 * @param props The chapter to show, and the section to open at.
 * @returns The screen.
 */
export function ChapterScreen(props: ChapterScreenProps): ReactElement {
  const { chapters, error, isPending, refetch } = useHandbook()
  const { folders } = useFaq()
  const found = chapterAt(chapters, props.slug)
  const entry = found?.entry
  const section = found?.page?.slug ?? props.section
  const reading = useReadingPage(entry)
  const { copy, menu } = useHandbookMenu(chapters, folders)

  // The section is scrolled to once the content is there to scroll to – on arrival, and
  // again when the handbook arrives after a cold start.
  const isReady = entry !== undefined
  useEffect(() => {
    if (!isReady || section === undefined) {
      return
    }
    document.querySelector(`#${CSS.escape(section)}`)?.scrollIntoView({ block: "start" })
  }, [isReady, section])

  if (isPending) {
    return (
      <>
        <PageTitle title="Handbok" />
        <p className="handbook-chapter-status" role="status">
          Hämtar handboken …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Handbok" />
        <p className="handbook-chapter-status" role="status">
          Handboken kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  if (entry === undefined) {
    return (
      <>
        <PageTitle title="Sidan finns inte" />
        <p className="handbook-chapter-status" role="status">
          Kapitlet finns inte i handboken.
        </p>
      </>
    )
  }

  const now = new Date()

  return (
    <>
      <PageTitle title={entry.chapter.name} />
      <PageActions menu={menu} />
      <HandbookOutline chapters={chapters} current={entry} folders={folders} reading={reading} />
      {entry.pages.map((page) => (
        <PageSection key={page.id} entry={entry} now={now} page={page} />
      ))}
      <HandbookOnward chapters={chapters} folders={folders} here={{ entry, kind: "chapter" }} />
      {copy}
    </>
  )
}
