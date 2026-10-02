import { Button, Card, PageTitle } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { fileCount, fileFacts } from "../../../model/format"
import { isDrawnWhite } from "../../../model/tone"
import { filesIn, foldersIn, trailTo } from "../../../model/tree"
import { FolderRow } from "../../components/folderrow/FolderRow"
import { MaterialStatus } from "../../components/status/MaterialStatus"
import { FileTile } from "../../components/tile/FileTile"
import { useMaterial } from "./use-material"

export interface FolderScreenProps {
  /**
   * The Drive id of the folder to show.
   */
  readonly folderId: string
}

/**
 * One folder of the material: the folders inside it as rows, and its files as tiles,
 * because most of the files are pictures whose names differ by one word.
 * @param props The folder to show.
 * @returns The screen.
 */
export function FolderScreen(props: FolderScreenProps): ReactElement {
  const { error, isPending, nodes, refetch } = useMaterial()

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

  const trail = trailTo(nodes, props.folderId)
  const folder = trail.at(-1)
  if (folder === undefined) {
    return (
      <MaterialStatus
        action={<Button label="Till materialet" link={{ to: "/material" }} />}
        message="Mappen finns inte längre i materialet."
        title="Mappen finns inte"
      />
    )
  }

  const folders = foldersIn(folder.children)
  const files = filesIn(folder.children)
  // A folder of white symbols is often named only for its format, so whether its tiles
  // need a dark backdrop is said by the folders above it.
  const tone = isDrawnWhite(trail.map((step) => step.name)) ? "dark" : "light"

  return (
    <>
      <PageTitle title={folder.name} />
      {folders.length === 0 ? null : (
        <Card title="Mappar">
          {folders.map((child) => (
            <FolderRow folder={child} key={child.id} />
          ))}
        </Card>
      )}
      {files.length === 0 ? null : (
        <Card aside={<span aria-hidden="true">{fileCount(files.length)}</span>} title="Filer">
          <div className="tile-grid">
            {files.map((file) => (
              <FileTile file={file} key={file.id} meta={fileFacts(file)} tone={tone} />
            ))}
          </div>
        </Card>
      )}
      {folders.length === 0 && files.length === 0 ? (
        <MaterialStatus message="Mappen är tom." />
      ) : null}
    </>
  )
}
