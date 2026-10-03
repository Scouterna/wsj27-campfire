import { DownloadIcon, PageActions } from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement, type RefObject } from "react"

import type { Frame } from "../../../model/social/Frame"
import { useDownload } from "./use-download"

export interface DownloadActionProps {
  /**
   * The canvas the finished image is drawn on.
   */
  readonly canvas: RefObject<HTMLCanvasElement | null>
  /**
   * The frame the image is in, or undefined for none.
   */
  readonly frame: Frame | undefined
  /**
   * Whether there is an image to download – a photo, drawn.
   */
  readonly isComplete: boolean
}

/**
 * The download, as the page's one primary action: the floating button on a phone and the
 * button beside the title on a desktop. A page action cannot be shown unavailable, so it
 * is declared only once there is an image to save.
 * @param props The canvas, the frame, and whether there is an image yet.
 * @returns What a failed download says, if anything.
 */
export function DownloadAction(props: DownloadActionProps): ReactElement | null {
  const saving = useDownload(props.canvas, props.frame)
  const { download } = saving
  // Built once, since the page declares its actions again whenever they change.
  const action = useMemo(
    () => ({
      icon: <DownloadIcon size={24} strokeWidth={2.2} />,
      label: "Ladda ner",
      onPress: download,
    }),
    [download],
  )

  return (
    <>
      <PageActions action={props.isComplete ? action : undefined} />
      {saving.hasFailed ? (
        <p className="frame-error" role="status">
          Bilden kunde inte skapas.
        </p>
      ) : null}
    </>
  )
}
