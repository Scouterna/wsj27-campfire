import { Font, type DocumentProps } from "@react-pdf/renderer"
import type { ReactElement } from "react"

import type { HandbookDocument } from "../../model/documents"
import { drawableDocument } from "./drawable"
import { HandbookPdf } from "./HandbookPdf"
import { displayFace, type PdfColors } from "./pdf-look"

/**
 * Everything a document is made from.
 */
export interface DocumentRequest {
  /**
   * The colors to set it in.
   */
  readonly colors: PdfColors
  /**
   * The document.
   */
  readonly document: HandbookDocument
  /**
   * Where the display face's font file is read from.
   */
  readonly fontFile: string
  /**
   * The contingent's mark for the cover, as a `data:` address of a PNG or a JPEG, when it
   * could be read.
   */
  readonly logo?: string | undefined
  /**
   * The content's pictures as `data:` addresses of PNGs or JPEGs, by the address the
   * content names each by.
   */
  readonly pictures: ReadonlyMap<string, string>
}

/**
 * Sets a document and hands it to whoever writes it out. The document is laid out twice,
 * because the table of contents can only number its lines once the sheets after it are
 * laid out, and its own length does not depend on the numbers – so the second layout
 * lands every line where the first one did.
 * @param request What to make the document from.
 * @param write Writes a laid-out document out – to a file, or to memory.
 * @returns What the second writing answered.
 */
export async function renderDocument<Written>(
  request: DocumentRequest,
  write: (document: ReactElement<DocumentProps>) => Promise<Written>,
): Promise<Written> {
  Font.register({ family: displayFace, src: request.fontFile })
  // A word is never broken, because the built-in breaking is English's.
  Font.registerHyphenationCallback((word) => [word])

  const document = drawableDocument(request.document)
  const placed = new Map<string, number>()
  const setting = { colors: request.colors, pictures: request.pictures }
  // The library asks for the document element itself, and what it is handed here is the
  // component that renders one – which it lays out just the same.
  const set = (
    sheets: ReadonlyMap<string, number>,
    onPlace: (anchor: string, sheet: number) => void,
  ): ReactElement<DocumentProps> =>
    (
      <HandbookPdf
        document={document}
        logo={request.logo}
        placed={sheets}
        setting={{ ...setting, onPlace }}
      />
    ) as ReactElement<DocumentProps>

  await write(
    set(new Map(), (anchor, sheet) => {
      placed.set(anchor, sheet)
    }),
  )
  return write(
    set(placed, () => {
      // Every anchor's sheet is known by now.
    }),
  )
}
