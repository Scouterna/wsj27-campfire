import type { ReactElement } from "react"

export interface DownloadLinkProps {
  /**
   * The file's full name, which the control is called by out loud, because several pills
   * side by side read alike.
   */
  readonly fileName: string
  /**
   * The format on the pill – "SVG", "PNG" – where a file comes in more than one, or
   * undefined for the pill to say "Ladda ner".
   */
  readonly format?: string
  /**
   * Where the bytes come from.
   */
  readonly href: string
}

/**
 * The download control under a tile: a small pill naming the format it fetches.
 *
 * A link rather than a button, so the browser's own download handling applies and a long
 * press offers what a long press on a link offers. It carries no `download` attribute,
 * because the bytes come from another origin, where the attribute is ignored and the
 * answer's own disposition decides.
 *
 * @param props The file, the format, and where the bytes are.
 * @returns The control.
 */
export function DownloadLink(props: DownloadLinkProps): ReactElement {
  return (
    <a
      aria-label={
        props.format === undefined
          ? `Ladda ner ${props.fileName}`
          : `Ladda ner ${props.fileName} som ${props.format}`
      }
      className="tile-download"
      href={props.href}
      rel="noreferrer"
    >
      {props.format ?? "Ladda ner"}
    </a>
  )
}
