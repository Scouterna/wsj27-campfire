import {
  Button,
  Card,
  PageTitle,
  SearchField,
  unitsReveal,
  useIsRevealed,
  useUnitIdentities,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useDeferredValue, useMemo, useState, type ReactElement } from "react"

import { fileCount, fileFacts, typeName } from "../../../model/format"
import type { MaterialNode } from "../../../model/MaterialNode"
import { isDrawnWhite } from "../../../model/tone"
import { filesIn, foldersIn, searchFiles } from "../../../model/tree"
import { unitSymbols } from "../../../model/unit-symbols"
import { FolderRow } from "../../components/folderrow/FolderRow"
import { MaterialStatus } from "../../components/status/MaterialStatus"
import { DownloadLink } from "../../components/tile/DownloadLink"
import { FileTile } from "../../components/tile/FileTile"
import { MaterialTile } from "../../components/tile/MaterialTile"
import { useMaterial } from "./use-material"

import "./MaterialScreen.css"

/**
 * The material start screen: the signed-in leader's own unit's symbols first, then the
 * folders, with a search across everything above them.
 *
 * The folders on Drive are several levels deep, and a leader who wants their unit's
 * logotype should not have to walk them, so the screen resolves that one thing and offers
 * the rest as folders underneath.
 * @returns The screen.
 */
export function MaterialScreen(): ReactElement {
  const { error, isPending, nodes, refetch } = useMaterial()
  const [query, setQuery] = useState("")
  // Every keystroke searches the whole tree, so the results follow the field rather than
  // holding it up.
  const deferredQuery = useDeferredValue(query)

  if (isPending) {
    return <MaterialStatus message="Hämtar materialet …" title="Material" />
  }

  if (error !== null) {
    return (
      <MaterialStatus
        action={<Button label="Försök igen" onPress={refetch} />}
        message="Materialet kunde inte hämtas."
        title="Material"
      />
    )
  }

  if (nodes.length === 0) {
    return <MaterialStatus message="Det finns inget material ännu." title="Material" />
  }

  return (
    <>
      <PageTitle title="Material" />
      <div className="material-search">
        <SearchField
          label="Sök i materialet"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder="Sök på namn eller mapp"
          value={query}
        />
      </div>
      {deferredQuery.trim() === "" ? (
        <>
          <UnitSymbolsCard nodes={nodes} />
          <TopLevel nodes={nodes} />
        </>
      ) : (
        <SearchResults nodes={nodes} query={deferredQuery} />
      )}
    </>
  )
}

export interface UnitSymbolsCardProps {
  /**
   * The material tree's top level.
   */
  readonly nodes: readonly MaterialNode[]
}

/**
 * The signed-in person's own unit's symbols, or nothing.
 *
 * Nothing for someone with no unit, and nothing until the units reveal opens, because
 * which number wears which animal is the surprise and this card spells it out. The
 * symbols stay in the folders below either way – the animals are not secret, only whose
 * they are.
 * @param props The material tree.
 * @returns The card, or null.
 */
function UnitSymbolsCard(props: UnitSymbolsCardProps): ReactElement | null {
  const user = useUser()
  const identities = useUnitIdentities()
  const isRevealed = useIsRevealed(unitsReveal.id)
  const unitNumber = user?.unit?.number
  const unitName = unitNumber === undefined ? undefined : identities.name(unitNumber)

  const symbols = useMemo(
    () => (unitName === undefined ? [] : unitSymbols(props.nodes, unitName)),
    [props.nodes, unitName],
  )

  if (!isRevealed || unitNumber === undefined || unitName === undefined || symbols.length === 0) {
    return null
  }

  return (
    <Card title="Din avdelnings symboler">
      <div className="tile-grid">
        {symbols.map((symbol) => (
          <MaterialTile
            key={`${symbol.shape}-${symbol.tone}`}
            label={symbol.label}
            picture={symbol.preview.pictureUrl}
            placeholder={typeName(symbol.preview)}
            thumbnail={symbol.preview.thumbnailUrl}
            tone={symbol.tone === "white" ? "dark" : "light"}
          >
            {symbol.files.map((file) => (
              <DownloadLink
                fileName={file.name}
                format={typeName(file)}
                href={file.downloadUrl}
                key={file.id}
              />
            ))}
          </MaterialTile>
        ))}
      </div>
    </Card>
  )
}

export interface TopLevelProps {
  /**
   * The material tree's top level.
   */
  readonly nodes: readonly MaterialNode[]
}

/**
 * The tree's top level: a row per folder, and a tile per file that sits beside them.
 * @param props The material tree.
 * @returns The cards, each left out when it would be empty.
 */
function TopLevel(props: TopLevelProps): ReactElement {
  const folders = foldersIn(props.nodes)
  const files = filesIn(props.nodes)

  return (
    <>
      {folders.length === 0 ? null : (
        <Card title="Allt material">
          {folders.map((folder) => (
            <FolderRow folder={folder} key={folder.id} />
          ))}
        </Card>
      )}
      {files.length === 0 ? null : (
        <Card title="Lösa filer">
          <div className="tile-grid">
            {files.map((file) => (
              <FileTile file={file} key={file.id} meta={fileFacts(file)} tone="light" />
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

export interface SearchResultsProps {
  /**
   * The material tree's top level.
   */
  readonly nodes: readonly MaterialNode[]
  /**
   * What the reader typed.
   */
  readonly query: string
}

/**
 * Every file the search matches, from anywhere in the tree, each saying which folders it
 * is in, because the same name can sit in more than one.
 * @param props The tree, and the query.
 * @returns The results, or a status when there are none.
 */
function SearchResults(props: SearchResultsProps): ReactElement {
  const results = useMemo(() => searchFiles(props.nodes, props.query), [props.nodes, props.query])

  if (results.length === 0) {
    return <MaterialStatus message="Inget material matchar sökningen." />
  }

  return (
    <Card aside={<span aria-hidden="true">{fileCount(results.length)}</span>} title="Sökresultat">
      <div className="tile-grid">
        {results.map(({ file, trail }) => (
          <FileTile
            file={file}
            key={file.id}
            // The two innermost folders, because the outer ones are shared by whole
            // branches and the inner ones are what tell two same-named files apart.
            meta={trail.length === 0 ? fileFacts(file) : trail.slice(-2).join(" › ")}
            tone={isDrawnWhite(trail) ? "dark" : "light"}
          />
        ))}
      </div>
    </Card>
  )
}
