import { Button, PageActions, PageTitle } from "@scouterna/wsj27-campfire-ui"
import { useEffect, type ReactElement } from "react"

import { faqTitle, folderAt } from "../../../model/Faq"
import { HandbookOnward } from "../../components/handbookonward/HandbookOnward"
import { HandbookOutline } from "../../components/handbookoutline/HandbookOutline"
import { QuestionCard } from "../../components/questioncard/QuestionCard"
import { useAskQuestion } from "../../use-ask-question"
import { useFaq } from "../../use-faq"
import { useHandbook } from "../../use-handbook"
import { useHandbookMenu } from "../../use-handbook-menu"

import "./FaqFolderScreen.css"

export type FaqFolderScreenProps = {
  /**
   * The id of the folder to show, as the address spells it.
   */
  readonly folderId: string
  /**
   * The id of the question to open at, or undefined for the folder's top.
   */
  readonly question?: string
}

/**
 * One folder of the FAQ, read as one document: every question as a card of its own, dated
 * – marked while it is new or changed – with its answer under it, and the folders either
 * side of it.
 * @param props The folder to show, and the question to open at.
 * @returns The screen.
 */
export function FaqFolderScreen(props: FaqFolderScreenProps): ReactElement {
  const { error, folders, isPending, refetch } = useFaq()
  const { chapters } = useHandbook()
  const { copy, menu } = useHandbookMenu(chapters, folders)
  const folder = folderAt(folders, props.folderId)
  const ask = useAskQuestion(
    folder === undefined ? "Fråga om WSJ27" : `Fråga om WSJ27 – ${folder.name}`,
  )

  // The question is scrolled to once the answers are there to scroll to – on arrival, and
  // again when the FAQ arrives after a cold start.
  const isReady = folder !== undefined
  useEffect(() => {
    if (!isReady || props.question === undefined) {
      return
    }
    document.querySelector(`#${CSS.escape(props.question)}`)?.scrollIntoView({ block: "start" })
  }, [isReady, props.question])

  if (isPending) {
    return (
      <>
        <PageTitle title={faqTitle} />
        <p className="handbook-faq-status" role="status">
          Hämtar frågorna …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title={faqTitle} />
        <p className="handbook-faq-status" role="status">
          Frågorna kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  if (folder === undefined) {
    return (
      <>
        <PageTitle title="Sidan finns inte" />
        <p className="handbook-faq-status" role="status">
          Mappen finns inte bland frågorna.
        </p>
        <Button label="Till handboken" link={{ to: "/handbook" }} />
      </>
    )
  }

  const now = new Date()

  return (
    <>
      <PageTitle title={folder.name} />
      <PageActions {...(ask.action !== undefined && { action: ask.action })} menu={menu} />
      <HandbookOutline chapters={chapters} currentFolder={folder.id} folders={folders} />
      {folder.questions.length === 0 ? (
        <p className="handbook-faq-status" role="status">
          Mappen har inga frågor ännu.
        </p>
      ) : null}
      {folder.questions.map((question) => (
        <QuestionCard key={question.id} now={now} question={question} />
      ))}
      <HandbookOnward chapters={chapters} folders={folders} here={{ folder, kind: "folder" }} />
      {ask.sheet}
      {copy}
    </>
  )
}
