import { host } from "@scouterna/wsj27-campfire-host"
import {
  useTheme,
  type OverflowMenuItem,
  type OverflowMenuReceipt,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement } from "react"

import { documentsOf, type HandbookDocument } from "../model/documents"
import type { FaqFolder } from "../model/Faq"
import type { ChapterEntry } from "../model/Handbook"
import { PrintedHandbook } from "./components/printedhandbook/PrintedHandbook"
import { downloadDocument } from "./pdf/download-document"

/**
 * A handbook screen's menu, and the printed copy that goes with it.
 */
export interface HandbookMenu {
  /**
   * The copy the browser's own print command puts on paper, to place anywhere on the
   * screen – it shows only when printed.
   */
  readonly copy: ReactElement
  /**
   * The menu's entries: the handbook and each appendix as a PDF, and for an editor the
   * way into the CMS.
   */
  readonly menu: readonly OverflowMenuItem[]
}

/**
 * What a screen adds to its handbook menu.
 */
export interface HandbookMenuOptions {
  /**
   * The entries into the CMS, for an editor, after the documents.
   */
  readonly editor?: readonly OverflowMenuItem[] | undefined
}

/**
 * Makes a document as a PDF and says how it went, in the few words the menu has room for.
 * @param handbook The document.
 * @param theme The unit color to set it in.
 * @returns The receipt.
 */
async function download(handbook: HandbookDocument, theme: Theme): Promise<OverflowMenuReceipt> {
  try {
    await downloadDocument(handbook, theme)
    return { words: "Nedladdad" }
  } catch {
    return { isFailure: true, words: "Gick inte att skapa" }
  }
}

/**
 * The menu every handbook screen offers, and the copy the browser prints. The handbook
 * and each of its appendices can be had as a PDF, made on the device – the document to
 * print, which is why the menu offers no printing of its own. The browser's own print
 * command still puts the whole handbook on paper, the FAQ included, wherever the reader
 * is, rather than the screen.
 *
 * The PDFs are offered only in a browser, because a shell's web view has no way to save
 * a file the page made.
 * @param chapters Every chapter, in reading order.
 * @param folders Every FAQ folder, in reading order, printed after the chapters.
 * @param options The entries into the CMS the screen offers after the documents, if any.
 * @returns The menu, and the printed copy.
 */
export function useHandbookMenu(
  chapters: readonly ChapterEntry[],
  folders: readonly FaqFolder[],
  options: HandbookMenuOptions = {},
): HandbookMenu {
  const { editor } = options
  const theme = useTheme()

  const menu = useMemo((): readonly OverflowMenuItem[] => {
    const documents: OverflowMenuItem[] =
      host.tier === "browser"
        ? documentsOf(chapters).map((handbook) => ({
            label: `Ladda ner ${handbook.kind === "handbook" ? "handboken" : handbook.title} (PDF)`,
            onPerform: async () => download(handbook, theme),
          }))
        : []
    const groups = [documents, editor ?? []].filter((group) => group.length > 0)
    return groups.flatMap((group, index): readonly OverflowMenuItem[] =>
      index === 0 ? group : ["divider", ...group],
    )
  }, [chapters, editor, theme])

  // Held still, so a screen that renders often – as the reader scrolls – does not draw
  // the whole handbook again each time for a copy nobody sees.
  const copy = useMemo(
    () => <PrintedHandbook chapters={chapters} folders={folders} />,
    [chapters, folders],
  )

  return { copy, menu }
}
