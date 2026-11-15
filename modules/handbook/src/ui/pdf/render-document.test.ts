import { renderToBuffer } from "@react-pdf/renderer"
import { fileURLToPath } from "node:url"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { documentsOf } from "../../model/documents"
import { chaptersOf, inReadingOrder, type Chapter, type HandbookPage } from "../../model/Handbook"
import type { Block } from "../../model/RichText"
import type { HandbookPdfProps } from "./HandbookPdf"
import { renderDocument, type DocumentRequest } from "./render-document"

const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }
const camp: Chapter = { id: 3, name: "Lägret", order: 30, slug: "lagret" }

/**
 * A stretch of plain text.
 * @param text The words.
 * @returns The run.
 */
function run(text: string): Extract<Block, { kind: "paragraph" }>["children"][number] {
  return {
    isBold: false,
    isItalic: false,
    isStruck: false,
    isUnderlined: false,
    kind: "text",
    text,
  }
}

const content: readonly Block[] = [
  { children: [run("Hotell")], kind: "heading", rank: 1 },
  {
    children: [run("Vi bor på hotell – åäö."), { kind: "linebreak" }, run("Två nätter.")],
    kind: "paragraph",
  },
  {
    isOrdered: true,
    items: [{ children: [run("Packa")], nested: [] }],
    kind: "list",
  },
  {
    kind: "table",
    rows: [
      [
        { blocks: [{ children: [run("Tid")], kind: "paragraph" }], isHeader: true },
        { blocks: [{ children: [run("Passets innehåll")], kind: "paragraph" }], isHeader: true },
      ],
      [
        { blocks: [{ children: [run("19.00")], kind: "paragraph" }], isHeader: false },
        { blocks: [{ children: [run("Ankomst till stuga")], kind: "paragraph" }], isHeader: false },
      ],
    ],
  },
]

/**
 * A page in a chapter.
 * @param chapter Its chapter.
 * @param title The page's title, which is also its slug.
 * @param position Where it sits in the handbook.
 * @returns The page.
 */
function page(chapter: Chapter, title: string, position: number): HandbookPage {
  return {
    change: { at: "2026-11-05T10:00:00.000Z", text: "Nytt." },
    chapter,
    content,
    id: position,
    isPublic: true,
    position,
    slug: title,
    title,
  }
}

const pages = [page(travel, "boende", 1), page(camp, "mat", 2)]

const [handbook] = documentsOf(chaptersOf(inReadingOrder(pages)))

/**
 * What to make the document from, with the display face read from the library's file.
 * @returns The request.
 */
function request(): DocumentRequest {
  if (handbook === undefined) {
    throw new Error("The fixture holds no handbook")
  }
  return {
    colors: { bright: "#2a7a8c", ink: "#215262", onBright: "#ffffff" },
    document: handbook,
    fontFile: fileURLToPath(
      new URL("../../../../../libraries/ui/assets/fonts/bravelyscript.otf", import.meta.url),
    ),
    pictures: new Map(),
  }
}

describe("renderDocument", () => {
  it("sets a document, and numbers the table of contents by where its sheets landed", async () => {
    const laidOut: ReadonlyMap<string, number>[] = []
    const written = await renderDocument(request(), async (document) => {
      laidOut.push((document as unknown as ReactElement<HandbookPdfProps>).props.placed)
      return renderToBuffer(document)
    })

    expect(written.subarray(0, 5).toString("latin1")).toBe("%PDF-")
    // The cover, the contents, the change log, and a sheet for each chapter.
    expect(written.toString("latin1").match(/\/Type \/Page\b/gu)).toHaveLength(5)
    expect(laidOut[0]?.size).toBe(0)
    expect(Object.fromEntries(laidOut[1] ?? [])).toEqual({
      "chapter-lagret": 5,
      "chapter-resa": 4,
      "page-boende": 4,
      "page-boende-0": 4,
      "page-mat": 5,
      "page-mat-0": 5,
    })
  })
})
