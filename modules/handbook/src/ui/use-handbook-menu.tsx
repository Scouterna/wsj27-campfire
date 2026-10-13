import { host } from "@scouterna/wsj27-campfire-host"
import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import { useEffect, useMemo, useState, type ReactElement } from "react"

import type { ChapterEntry } from "../model/Handbook"
import { PrintedHandbook } from "./components/printedhandbook/PrintedHandbook"
import { useEditorMenu } from "./use-editor-menu"

/**
 * A handbook screen's menu, and the printed copy that goes with it.
 */
export interface HandbookMenu {
  /**
   * The copy printing puts on paper, to place anywhere on the screen – it shows only
   * when printed.
   */
  readonly copy: ReactElement
  /**
   * The menu's entries: printing, and for an editor the way into the CMS.
   */
  readonly menu: readonly OverflowMenuItem[]
}

/**
 * What prints: the whole handbook, or the chapter on screen alone.
 */
type Scope = "chapter" | "whole"

/**
 * Opens the print dialog once the copy has rendered. The copy has to be in the document
 * before the dialog opens, and two frames see to it – the first commits the copy, the
 * second has it laid out.
 */
function printSoon(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(openDialog)
  })
}

/**
 * Opens the browser's print dialog.
 */
function openDialog(): void {
  print()
}

/**
 * The menu every handbook screen offers, and the copy it prints. A chapter prints either
 * itself or the whole handbook; the contents print the whole. The browser's own print
 * command prints the whole handbook wherever the reader is.
 *
 * Printing is offered only in a browser, because a shell's web view has no print dialog
 * of its own – the browser's can also save a PDF.
 * @param chapters Every chapter, in reading order.
 * @param entry The chapter on screen, or undefined on the contents.
 * @returns The menu, and the printed copy.
 */
export function useHandbookMenu(
  chapters: readonly ChapterEntry[],
  entry?: ChapterEntry,
): HandbookMenu {
  const editor = useEditorMenu(entry?.chapter.id)
  const [scope, setScope] = useState<Scope>("whole")

  // The copy goes back to the whole handbook once the dialog has closed, because that is
  // what the browser's own command prints.
  useEffect(() => {
    const reset = (): void => {
      setScope("whole")
    }
    addEventListener("afterprint", reset)
    return () => {
      removeEventListener("afterprint", reset)
    }
  }, [])

  const menu = useMemo((): readonly OverflowMenuItem[] => {
    const printing: OverflowMenuItem[] = []
    if (host.tier === "browser") {
      const ask = (next: Scope): void => {
        setScope(next)
        printSoon()
      }
      if (entry !== undefined) {
        printing.push({
          label: "Skriv ut kapitlet",
          onSelect: () => {
            ask("chapter")
          },
        })
      }
      printing.push({
        label: entry === undefined ? "Skriv ut handboken" : "Skriv ut hela handboken",
        onSelect: () => {
          ask("whole")
        },
      })
    }
    if (editor === undefined) {
      return printing
    }
    return printing.length === 0 ? editor : [...printing, "divider", ...editor]
  }, [editor, entry])

  const copy =
    scope === "chapter" && entry !== undefined ? (
      <PrintedHandbook chapters={[entry]} isWhole={false} />
    ) : (
      <PrintedHandbook chapters={chapters} isWhole />
    )

  return { copy, menu }
}
