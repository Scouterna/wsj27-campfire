import { describe, expect, it } from "vitest"

import { toBlocks } from "./LexicalDto"

/**
 * A text node the way the editor writes one.
 * @param text The text.
 * @param format The editor's format bits.
 * @returns The node.
 */
function text(text: string, format = 0): Record<string, unknown> {
  return { detail: 0, format, mode: "normal", style: "", text, type: "text", version: 1 }
}

/**
 * A document whose root holds the given nodes.
 * @param children The root's children.
 * @returns The document.
 */
function document(...children: unknown[]): unknown {
  return { root: { children, type: "root", version: 1 } }
}

/**
 * A link node, its text its own address.
 * @param url Where it leads.
 * @returns The node.
 */
function link(url: string): unknown {
  return { children: [text(url)], fields: { linkType: "custom", newTab: false, url }, type: "link" }
}

/**
 * A table cell holding one paragraph.
 * @param value The cell's text.
 * @param headerState The editor's header flag – 0 for an ordinary cell.
 * @returns The node.
 */
function cell(value: string, headerState: number): unknown {
  return {
    children: [{ children: [text(value)], type: "paragraph" }],
    headerState,
    type: "tablecell",
  }
}

const plain = { isBold: false, isItalic: false, isStruck: false, isUnderlined: false }

describe("toBlocks", () => {
  it("reads nothing out of something that is not a document", () => {
    expect(toBlocks(undefined)).toEqual([])
    expect(toBlocks({ root: "nope" })).toEqual([])
  })

  it("keeps a paragraph's emphasis and drops the empty ones left as spacing", () => {
    const blocks = toBlocks(
      document(
        { children: [text("Fet", 1), text(" och "), text("kursiv", 2)], type: "paragraph" },
        { children: [], type: "paragraph" },
      ),
    )
    expect(blocks).toEqual([
      {
        children: [
          { ...plain, isBold: true, kind: "text", text: "Fet" },
          { ...plain, kind: "text", text: " och " },
          { ...plain, isItalic: true, kind: "text", text: "kursiv" },
        ],
        kind: "paragraph",
      },
    ])
  })

  it("ranks headings against the page's own largest", () => {
    const blocks = toBlocks(
      document(
        { children: [text("Stor")], tag: "h3", type: "heading" },
        { children: [text("Mindre")], tag: "h4", type: "heading" },
        { children: [text("Minst")], tag: "h6", type: "heading" },
      ),
    )
    expect(blocks.map((block) => (block.kind === "heading" ? block.rank : undefined))).toEqual([
      1, 2, 3,
    ])
  })

  it("keeps a link to the web or to mail, and only the text of one to anywhere else", () => {
    const [paragraph] = toBlocks(
      document({
        children: [link("mailto:wsj@scouterna.se"), link("javascript:alert(1)")],
        type: "paragraph",
      }),
    )
    expect(paragraph).toEqual({
      children: [
        {
          children: [{ ...plain, kind: "text", text: "mailto:wsj@scouterna.se" }],
          href: "mailto:wsj@scouterna.se",
          kind: "link",
        },
        { ...plain, kind: "text", text: "javascript:alert(1)" },
      ],
      kind: "paragraph",
    })
  })

  it("hangs a nested list under the entry before it", () => {
    const [list] = toBlocks(
      document({
        children: [
          { children: [text("Ett")], type: "listitem", value: 1 },
          {
            children: [
              {
                children: [{ children: [text("Inne")], type: "listitem", value: 1 }],
                listType: "bullet",
                tag: "ul",
                type: "list",
              },
            ],
            type: "listitem",
            value: 2,
          },
        ],
        listType: "number",
        tag: "ol",
        type: "list",
      }),
    )
    expect(list).toEqual({
      isOrdered: true,
      items: [
        {
          children: [{ ...plain, kind: "text", text: "Ett" }],
          nested: [
            {
              isOrdered: false,
              items: [{ children: [{ ...plain, kind: "text", text: "Inne" }], nested: [] }],
              kind: "list",
            },
          ],
        },
      ],
      kind: "list",
    })
  })

  it("reads a table's header cells apart from its others", () => {
    const [table] = toBlocks(
      document({
        children: [{ children: [cell("Kanal", 1), cell("Vad", 0)], type: "tablerow" }],
        type: "table",
      }),
    )
    expect(table?.kind === "table" && table.rows[0]?.map((c) => c.isHeader)).toEqual([true, false])
  })

  it("serves an image from the application's own origin, at its medium size", () => {
    const [image] = toBlocks(
      document({
        relationTo: "media",
        type: "upload",
        value: {
          alt: "Karta",
          height: 373,
          sizes: {
            md: {
              height: 200,
              url: "https://campfire.wsj27.scouterna.net/_services/cms/api/media/file/karta-400.webp",
              width: 400,
            },
          },
          url: "https://campfire.wsj27.scouterna.net/_services/cms/api/media/file/karta.png",
          width: 756,
        },
      }),
    )
    expect(image).toEqual({
      alt: "Karta",
      height: 200,
      kind: "image",
      src: "/_services/cms/api/media/file/karta-400.webp",
      width: 400,
    })
  })

  it("drops an upload whose media record did not come along", () => {
    expect(toBlocks(document({ relationTo: "media", type: "upload", value: 1 }))).toEqual([])
  })
})

describe("toBlocks, as the CMS writes quotes and images", () => {
  it("reads a quote's paragraphs as its lines", () => {
    const [quote] = toBlocks(
      document({
        children: [
          { children: [text("Ett")], type: "paragraph" },
          { children: [text("Två")], type: "paragraph" },
        ],
        type: "quote",
      }),
    )
    expect(quote).toEqual({
      children: [
        { ...plain, kind: "text", text: "Ett" },
        { kind: "linebreak" },
        { ...plain, kind: "text", text: "Två" },
      ],
      kind: "quote",
    })
  })

  it("lifts an image out of the paragraph it was placed in", () => {
    const blocks = toBlocks(
      document({
        children: [
          text("Före"),
          { type: "upload", value: { alt: "", height: 1, url: "/bild.png", width: 2 } },
          text("Efter"),
        ],
        type: "paragraph",
      }),
    )
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "image", "paragraph"])
  })
})
