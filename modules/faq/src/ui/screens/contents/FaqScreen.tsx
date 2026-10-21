import { Button, Card, PageTitle, Row, SearchField } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import { useDeferredValue, useMemo, useState, type ReactElement } from "react"

import { questionCount, type FaqFolder } from "../../../model/Faq"
import { searchFaq } from "../../../model/search"
import { FaqStatus } from "../../components/status/FaqStatus"
import { useFaq } from "../../use-faq"

import "./FaqScreen.css"

/**
 * The FAQ's front: a search over every question and answer, and every folder, numbered.
 * @returns The screen.
 */
export function FaqScreen(): ReactElement {
  const { error, folders, isPending, refetch } = useFaq()
  const [query, setQuery] = useState("")
  // Every keystroke searches every answer, so the hits follow the field rather than
  // holding it up.
  const deferredQuery = useDeferredValue(query.trim())

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

  if (folders.length === 0) {
    return <FaqStatus message="Det finns inga frågor ännu." title="Frågor och svar" />
  }

  return (
    <>
      <PageTitle title="Frågor och svar" />
      <div className="faq-search">
        <SearchField
          label="Sök bland frågorna"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder="Sök bland frågor och svar"
          value={query}
        />
      </div>
      {deferredQuery === "" ? (
        <Folders folders={folders} />
      ) : (
        <Hits folders={folders} query={deferredQuery} />
      )}
    </>
  )
}

export interface FoldersProps {
  /**
   * The folders, in reading order.
   */
  readonly folders: readonly FaqFolder[]
}

/**
 * Every folder as a numbered row, then the note that the FAQ reads offline and where it
 * comes from.
 * @param props The folders.
 * @returns The list.
 */
function Folders(props: FoldersProps): ReactElement {
  return (
    <>
      <Card>
        {props.folders.map((folder, index) => (
          <Row
            className="faq-folder-row"
            key={folder.id}
            leading={
              <span className="faq-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            }
            link={{ params: { folder: String(folder.id) }, to: "/faq/$folder" }}
          >
            <strong>{folder.name}</strong>
            <small>{questionCount(folder.questions.length)}</small>
          </Row>
        ))}
      </Card>
      <p className="faq-offline">
        Alla frågor och svar är nedladdade – de fungerar utan täckning på lägret.
      </p>
      <p className="faq-source">
        Svaren kommer från{" "}
        <a
          href="https://support.scouterna.se/support/solutions/75000005979"
          rel="noopener noreferrer"
          target="_blank"
        >
          Scoutsupport
        </a>
        , där du också kan ställa en egen fråga.
      </p>
    </>
  )
}

export interface HitsProps {
  /**
   * The folders, in reading order.
   */
  readonly folders: readonly FaqFolder[]
  /**
   * The text searched for, trimmed.
   */
  readonly query: string
}

/**
 * The search's hits, each leading to its question in its folder.
 * @param props The folders, and the query.
 * @returns The hits, or a status when there are none.
 */
function Hits(props: HitsProps): ReactElement {
  const hits = useMemo(() => searchFaq(props.folders, props.query), [props.folders, props.query])

  if (hits.length === 0) {
    return <FaqStatus message={`Inget bland frågorna matchar ”${props.query}”.`} />
  }

  return (
    <Card>
      <ol className="faq-hits" aria-label="Träffar">
        {hits.map((hit, index) => (
          <li key={index}>
            <Link
              className="faq-hit"
              hash={String(hit.question.id)}
              params={{ folder: String(hit.folder.id) }}
              to="/faq/$folder"
            >
              <small>{hit.folder.name}</small>
              <strong>{hit.question.title}</strong>
              <span>
                {hit.before}
                <mark>{hit.match}</mark>
                {hit.after}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}
