import { Button, Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import { useEffect, type ReactElement } from "react"

import { folderAt } from "../../../model/Faq"
import { RichText } from "../../components/richtext/RichText"
import { FaqStatus } from "../../components/status/FaqStatus"
import { useFaq } from "../../use-faq"

import "./FolderScreen.css"

export interface FolderScreenProps {
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
 * One folder of the FAQ, read as one document: every question as a card of its own,
 * with its answer under it.
 * @param props The folder to show, and the question to open at.
 * @returns The screen.
 */
export function FolderScreen(props: FolderScreenProps): ReactElement {
  const { error, folders, isPending, refetch } = useFaq()
  const folder = folderAt(folders, props.folderId)

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
    return <FaqStatus message="Hämtar frågorna …" title="Frågor och svar" />
  }

  if (error !== null) {
    return (
      <FaqStatus
        action={<Button label="Försök igen" onPress={refetch} />}
        message="Frågorna kunde inte hämtas."
        title="Frågor och svar"
      />
    )
  }

  if (folder === undefined) {
    return (
      <FaqStatus
        action={<Button label="Till frågorna" link={{ to: "/faq" }} />}
        message="Mappen finns inte längre bland frågorna."
        title="Mappen finns inte"
      />
    )
  }

  return (
    <>
      <PageTitle title={folder.name} />
      {folder.questions.length === 0 ? <FaqStatus message="Mappen har inga frågor ännu." /> : null}
      {folder.questions.map((question) => (
        <div className="faq-question" id={String(question.id)} key={question.id}>
          <Card title={question.title}>
            <RichText blocks={question.answer} headingLevel={3} />
          </Card>
        </div>
      ))}
    </>
  )
}
