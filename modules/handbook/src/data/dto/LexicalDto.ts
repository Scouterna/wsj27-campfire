import type {
  Block,
  HeadingBlock,
  ImageBlock,
  Inline,
  ListBlock,
  ListItem,
  ParagraphBlock,
  TableBlock,
  TableCell,
} from "../../model/RichText"
import { isRecord } from "./validation"

/**
 * One node of a page's content as the CMS stores it – the editor's own document tree,
 * serialized. Every field is `unknown`, because the tree is whatever the editor's plugins
 * wrote, and a node type the handbook does not draw is dropped rather than guessed at.
 */
export interface LexicalNodeDto {
  readonly children?: unknown
  readonly fields?: unknown
  readonly format?: unknown
  readonly headerState?: unknown
  readonly listType?: unknown
  readonly tag?: unknown
  readonly text?: unknown
  readonly type?: unknown
  readonly value?: unknown
}

// The editor's text format is a bit field. Code, subscript, and superscript have bits
// too, and are drawn as plain text, because the handbook's editors do not use them.
const bold = 1
const italic = 2
const strikethrough = 4
const underline = 8

// The schemes a link in the handbook may lead to. Anything else – `javascript:` above
// all – loses its link and keeps its text, because the content is written by people
// outside this repository and rendered inside the application's origin.
const allowedSchemes = new Set(["http:", "https:", "mailto:", "tel:"])

/**
 * A heading before its rank is known, which depends on the other headings on the page.
 */
type PendingHeading = Omit<HeadingBlock, "rank"> & { readonly level: number }

/**
 * A page's content, from the editor's serialized document to the handbook's blocks.
 *
 * Headings are ranked against the page's own largest, so a page whose editor started at
 * the third level reads the same as one that started at the first – the page's title is
 * the document's top heading either way. Empty paragraphs, which the editor leaves behind
 * as spacing, are dropped.
 * @param content The page's `content` field, as the CMS sent it.
 * @returns The blocks, in reading order – none when the document cannot be read.
 */
export function toBlocks(content: unknown): readonly Block[] {
  if (!isRecord(content) || !isRecord(content["root"])) {
    return []
  }
  const pending = blocksOf(content["root"]["children"])
  const levels = pending.flatMap((block) => ("level" in block ? [block.level] : []))
  const top = Math.min(...levels)
  return pending.map((block) => {
    if (!("level" in block)) {
      return block
    }
    const { level, ...heading } = block
    return { ...heading, rank: rankOf(level - top + 1) }
  })
}

/**
 * A heading's rank relative to the page's largest, held to the three the handbook draws.
 * @param relative The heading's level counted from the page's largest, which is 1.
 * @returns The rank to draw it at.
 */
function rankOf(relative: number): HeadingBlock["rank"] {
  if (relative <= 1) {
    return 1
  }
  return relative === 2 ? 2 : 3
}

/**
 * The blocks among a list of nodes, each converted or dropped.
 * @param nodes A node's `children`, as the CMS sent them.
 * @returns The blocks, headings still unranked.
 */
function blocksOf(nodes: unknown): readonly (Exclude<Block, HeadingBlock> | PendingHeading)[] {
  if (!Array.isArray(nodes)) {
    return []
  }
  return nodes.flatMap((node: unknown) => (isRecord(node) ? toBlock(node) : []))
}

/**
 * One block node, converted – into more than one block where the editor placed an image
 * inside a paragraph, since an image is drawn on a line of its own.
 * @param node The node.
 * @returns The blocks, none for a node the handbook does not draw.
 */
function toBlock(node: LexicalNodeDto): (Exclude<Block, HeadingBlock> | PendingHeading)[] {
  switch (node.type) {
    case "heading": {
      const level = typeof node.tag === "string" ? Number(node.tag.slice(1)) : NaN
      const children = inlinesOf(node.children)
      return Number.isSafeInteger(level) && children.length > 0
        ? [{ children, kind: "heading", level }]
        : []
    }
    case "list": {
      return optional(toList(node))
    }
    case "paragraph": {
      return paragraphsAround(node.children)
    }
    case "quote": {
      const children = quotedInlines(node.children)
      return children.length > 0 ? [{ children, kind: "quote" }] : []
    }
    case "table": {
      return optional(toTable(node))
    }
    case "upload": {
      return optional(toImage(node.value))
    }
    default: {
      return []
    }
  }
}

/**
 * A value as a list of none or one.
 * @param value The value, or undefined.
 * @returns The list.
 */
function optional<T>(value: T | undefined): T[] {
  return value === undefined ? [] : [value]
}

/**
 * A paragraph's text, split around any image placed inside it.
 * @param nodes The paragraph's `children`.
 * @returns The paragraphs and images, in reading order, empty paragraphs left out.
 */
function paragraphsAround(nodes: unknown): (ImageBlock | ParagraphBlock)[] {
  const blocks: (ImageBlock | ParagraphBlock)[] = []
  let run: unknown[] = []
  const flush = (): void => {
    const children = inlinesOf(run)
    if (children.length > 0) {
      blocks.push({ children, kind: "paragraph" })
    }
    run = []
  }
  const children: unknown[] = Array.isArray(nodes) ? nodes : []
  for (const node of children) {
    if (isRecord(node) && node["type"] === "upload") {
      flush()
      blocks.push(...optional(toImage(node["value"])))
    } else {
      run.push(node)
    }
  }
  flush()
  return blocks
}

/**
 * A quote's text. The editor writes a quote's text either directly or as paragraphs
 * inside it, and the paragraphs are joined by line breaks, as they were typed.
 * @param nodes The quote's `children`.
 * @returns The inlines.
 */
function quotedInlines(nodes: unknown): readonly Inline[] {
  const lines = (Array.isArray(nodes) ? (nodes as unknown[]) : []).map((node) =>
    inlinesOf(isRecord(node) && node["type"] === "paragraph" ? node["children"] : [node]),
  )
  return lines
    .filter((line) => line.length > 0)
    .flatMap((line, index): Inline[] =>
      index === 0 ? [...line] : [{ kind: "linebreak" }, ...line],
    )
}

/**
 * A list, with the lists nested in it.
 *
 * The editor nests a list as an entry of its own holding nothing but the inner list, so
 * such an entry hangs its list under the entry before it rather than drawing an empty
 * bullet.
 * @param node The list node.
 * @returns The list, or undefined when it holds no entries.
 */
function toList(node: LexicalNodeDto): ListBlock | undefined {
  if (!Array.isArray(node.children)) {
    return undefined
  }
  const items: ListItem[] = []
  for (const child of node.children as unknown[]) {
    if (!isRecord(child) || child["type"] !== "listitem") {
      continue
    }
    const children: unknown[] = Array.isArray(child["children"]) ? child["children"] : []
    const nested = children.flatMap((grandchild) => {
      const list =
        isRecord(grandchild) && grandchild["type"] === "list" ? toList(grandchild) : undefined
      return list === undefined ? [] : [list]
    })
    const inlines = inlinesOf(children)
    const previous = items.at(-1)
    if (inlines.length === 0 && previous !== undefined) {
      items[items.length - 1] = { ...previous, nested: [...previous.nested, ...nested] }
    } else if (inlines.length > 0 || nested.length > 0) {
      items.push({ children: inlines, nested })
    }
  }
  return items.length > 0
    ? { isOrdered: node.listType === "number", items, kind: "list" }
    : undefined
}

/**
 * A table, row by row, its cells holding blocks of their own.
 * @param node The table node.
 * @returns The table, or undefined when it has no rows.
 */
function toTable(node: LexicalNodeDto): TableBlock | undefined {
  if (!Array.isArray(node.children)) {
    return undefined
  }
  const rows = (node.children as unknown[]).flatMap((row) => {
    if (!isRecord(row) || !Array.isArray(row["children"])) {
      return []
    }
    const cells = (row["children"] as unknown[]).flatMap((cell): TableCell[] => {
      if (!isRecord(cell)) {
        return []
      }
      // Headings inside a cell are drawn as the cell's text, since a table is no place
      // for a section of the page.
      const blocks = blocksOf(cell["children"]).map((block) =>
        "level" in block ? { children: block.children, kind: "paragraph" as const } : block,
      )
      return [
        { blocks, isHeader: typeof cell["headerState"] === "number" && cell["headerState"] !== 0 },
      ]
    })
    return cells.length > 0 ? [cells] : []
  })
  return rows.length > 0 ? { kind: "table", rows } : undefined
}

/**
 * An uploaded illustration, at the size the handbook draws.
 *
 * The CMS names its files at its own public address, so the address is cut down to its
 * path – the file is served on the application's origin like everything else.
 * @param value The upload's media record, when the CMS populated it.
 * @returns The image, or undefined when the record did not come along or is not an
 * image.
 */
function toImage(value: unknown): ImageBlock | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const sizes = isRecord(value["sizes"]) ? value["sizes"] : {}
  const medium = isRecord(sizes["md"]) ? sizes["md"] : undefined
  const chosen = typeof medium?.["url"] === "string" ? medium : value
  const source = typeof chosen["url"] === "string" ? originRelative(chosen["url"]) : undefined
  const { height, width } = chosen
  if (source === undefined || typeof width !== "number" || typeof height !== "number") {
    return undefined
  }
  const alt = typeof value["alt"] === "string" ? value["alt"] : ""
  return { alt, height, kind: "image", src: source, width }
}

/**
 * An address the CMS wrote, as a path on the application's own origin.
 * @param url The address, absolute or already a path.
 * @returns The path with its query, or undefined when it cannot be read.
 */
function originRelative(url: string): string | undefined {
  try {
    const parsed = new URL(url, "https://campfire.invalid")
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return undefined
  }
}

/**
 * The inlines among a list of nodes, each converted or dropped. Nested lists and other
 * blocks are skipped here, because an entry's own text and its nested list are read
 * separately.
 * @param nodes A node's `children`, as the CMS sent them.
 * @returns The inlines.
 */
function inlinesOf(nodes: unknown): readonly Inline[] {
  if (!Array.isArray(nodes)) {
    return []
  }
  return (nodes as unknown[]).flatMap((node): Inline[] => {
    if (!isRecord(node)) {
      return []
    }
    return toInlines(node)
  })
}

/**
 * One inline node, converted.
 * @param node The node.
 * @returns The inlines it becomes – none for a node the handbook does not draw, and the
 * link's own text where the link's address is not one the handbook opens.
 */
function toInlines(node: LexicalNodeDto): Inline[] {
  switch (node.type) {
    case "autolink":
    case "link": {
      const children = inlinesOf(node.children)
      const url = isRecord(node.fields) ? node.fields["url"] : undefined
      const href = typeof url === "string" ? safeHref(url) : undefined
      return href === undefined ? [...children] : [{ children, href, kind: "link" }]
    }
    case "linebreak": {
      return [{ kind: "linebreak" }]
    }
    case "tab": {
      return [textRun(" ", 0)]
    }
    case "text": {
      if (typeof node.text !== "string" || node.text === "") {
        return []
      }
      return [textRun(node.text, typeof node.format === "number" ? node.format : 0)]
    }
    default: {
      return []
    }
  }
}

/**
 * A run of text with its emphasis read out of the editor's bit field.
 * @param text The run's text.
 * @param format The editor's format bits.
 * @returns The run.
 */
function textRun(text: string, format: number): Inline {
  return {
    isBold: (format & bold) !== 0,
    isItalic: (format & italic) !== 0,
    isStruck: (format & strikethrough) !== 0,
    isUnderlined: (format & underline) !== 0,
    kind: "text",
    text,
  }
}

/**
 * A link's address, when it leads somewhere the handbook may send a reader.
 * @param url The address the editor wrote.
 * @returns The address, or undefined for a scheme the handbook does not open.
 */
function safeHref(url: string): string | undefined {
  const trimmed = url.trim()
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed
  }
  try {
    return allowedSchemes.has(new URL(trimmed).protocol) ? trimmed : undefined
  } catch {
    return undefined
  }
}
