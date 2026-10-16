/**
 * A run of text inside a block, with the emphasis the editor gave it.
 */
export interface TextRun {
  readonly isBold: boolean
  readonly isItalic: boolean
  readonly isStruck: boolean
  readonly isUnderlined: boolean
  readonly kind: "text"
  readonly text: string
}

/**
 * A link around a stretch of runs, to an address outside the handbook – a web page, a
 * `mailto:`, or a `tel:`.
 */
export interface LinkInline {
  readonly children: readonly Inline[]
  readonly href: string
  readonly kind: "link"
}

/**
 * A line break inside a block, where the editor pressed shift and return.
 */
export interface LineBreak {
  readonly kind: "linebreak"
}

/**
 * What a block's text is made of.
 */
export type Inline = LineBreak | LinkInline | TextRun

/**
 * A heading inside a page. The rank is relative to the page, 1 being the page's own
 * largest, because the page's title already holds the document's top level.
 */
export interface HeadingBlock {
  readonly children: readonly Inline[]
  readonly kind: "heading"
  readonly rank: 1 | 2 | 3
}

/**
 * An illustration uploaded to the CMS, at the size the handbook draws it.
 */
export interface ImageBlock {
  readonly alt: string
  readonly height: number
  readonly kind: "image"
  readonly src: string
  readonly width: number
}

/**
 * One entry in a list: its own text, and any list nested under it.
 */
export interface ListItem {
  readonly children: readonly Inline[]
  readonly nested: readonly ListBlock[]
}

/**
 * A bulleted or a numbered list.
 */
export interface ListBlock {
  readonly isOrdered: boolean
  readonly items: readonly ListItem[]
  readonly kind: "list"
}

/**
 * A paragraph of running text.
 */
export interface ParagraphBlock {
  readonly children: readonly Inline[]
  readonly kind: "paragraph"
}

/**
 * A passage set apart from the running text.
 */
export interface QuoteBlock {
  readonly children: readonly Inline[]
  readonly kind: "quote"
}

/**
 * One cell of a table, which is a header when the editor marked its row or its column
 * as one.
 */
export interface TableCell {
  readonly blocks: readonly Block[]
  readonly isHeader: boolean
}

/**
 * A table, row by row.
 */
export interface TableBlock {
  readonly kind: "table"
  readonly rows: readonly (readonly TableCell[])[]
}

/**
 * One block of a page's content, in reading order.
 */
export type Block = HeadingBlock | ImageBlock | ListBlock | ParagraphBlock | QuoteBlock | TableBlock

/**
 * The plain text of a stretch of inlines.
 * @param inlines The inlines to flatten.
 * @returns Their text, with a line break read as a space.
 */
export function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.kind) {
        case "linebreak": {
          return " "
        }
        case "link": {
          return plainText(inline.children)
        }
        case "text": {
          return inline.text
        }
      }
    })
    .join("")
}

/**
 * The passages of text in a stretch of content, one per paragraph, heading, quote, list
 * entry, or table cell – the units a search finds a match in and quotes from.
 * @param blocks The content.
 * @returns The passages, in reading order, empty ones left out.
 */
export function passagesOf(blocks: readonly Block[]): readonly string[] {
  return blocks.flatMap((block): string[] => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
      case "quote": {
        return [plainText(block.children)]
      }
      case "image": {
        return []
      }
      case "list": {
        return listPassages(block)
      }
      case "table": {
        return block.rows.flatMap((row) => row.flatMap((cell) => passagesOf(cell.blocks)))
      }
    }
  })
}

/**
 * A list's entries as passages, nested entries after their own.
 * @param list The list.
 * @returns The passages.
 */
function listPassages(list: ListBlock): string[] {
  return list.items.flatMap((item) => [
    plainText(item.children),
    ...item.nested.flatMap((nested) => listPassages(nested)),
  ])
}
