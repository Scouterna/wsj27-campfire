import type { Block, Inline, ListBlock, ListItem, TableCell, TextRun } from "../../model/RichText"

/**
 * The emphasis a run of text is under, gathered from the elements around it.
 */
type Marks = Pick<TextRun, "isBold" | "isItalic" | "isStruck" | "isUnderlined">

const plain: Marks = { isBold: false, isItalic: false, isStruck: false, isUnderlined: false }

/**
 * The elements that start a block of their own. Anything else is read as part of the
 * text around it.
 */
const blockTags = new Set([
  "BLOCKQUOTE",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "OL",
  "P",
  "PRE",
  "TABLE",
  "UL",
])

/**
 * Where a relative link in an answer is resolved against – the help center the answer
 * was written in.
 */
const helpCenter = "https://support.scouterna.se"

/**
 * An answer's HTML as blocks. Only its structure survives – paragraphs, headings, lists,
 * tables, emphasis, and links – because the help center's editor pastes in the fonts,
 * colors, and sizes of wherever the text came from, and an answer is drawn in Campfire's.
 *
 * Parsed by the platform's `DOMParser`, which never runs a script or loads a resource of
 * what it parses, so the HTML is read as data rather than trusted.
 * @param html The answer, as the help center stores it.
 * @returns The blocks, in reading order, empty ones left out.
 */
export function toBlocks(html: string): readonly Block[] {
  const document = new DOMParser().parseFromString(html, "text/html")
  return blocksOf(document.body.childNodes)
}

/**
 * Nodes as blocks, with the text between block elements gathered into paragraphs. A line
 * break between two stretches of such text ends a paragraph, since that is how the
 * editor's users separate them.
 * @param nodes The nodes, in order.
 * @returns The blocks.
 */
function blocksOf(nodes: NodeListOf<ChildNode>): Block[] {
  const blocks: Block[] = []
  let loose: Inline[] = []
  const flush = (): void => {
    const paragraph = toParagraph(loose)
    if (paragraph !== undefined) {
      blocks.push(paragraph)
    }
    loose = []
  }

  for (const node of nodes) {
    if (node instanceof HTMLElement && blockTags.has(node.tagName)) {
      flush()
      blocks.push(...blockOf(node))
    } else if (node instanceof HTMLBRElement) {
      flush()
    } else {
      loose.push(...inlinesOf([node], plain))
    }
  }
  flush()
  return blocks
}

/**
 * One block element as the blocks it holds – usually one, more for a container.
 * @param element The element.
 * @returns The blocks.
 */
function blockOf(element: HTMLElement): Block[] {
  switch (element.tagName) {
    case "BLOCKQUOTE": {
      const children = trimmed(inlinesOf(element.childNodes, plain))
      return children.length === 0 ? [] : [{ children, kind: "quote" }]
    }
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const children = trimmed(inlinesOf(element.childNodes, plain))
      const rank = Math.min(Number(element.tagName.slice(1)), 3) as 1 | 2 | 3
      return children.length === 0 ? [] : [{ children, kind: "heading", rank }]
    }
    case "OL":
    case "UL": {
      const list = listOf(element)
      return list.items.length === 0 ? [] : [list]
    }
    case "TABLE": {
      const rows = [...element.querySelectorAll("tr")].map((row) =>
        [...row.children]
          .filter((cell) => cell instanceof HTMLTableCellElement)
          .map((cell): TableCell => ({
            blocks: blocksOf(cell.childNodes),
            isHeader: cell.tagName === "TH",
          })),
      )
      const kept = rows.filter((row) => row.some((cell) => cell.blocks.length > 0))
      return kept.length === 0 ? [] : [{ kind: "table", rows: kept }]
    }
    default: {
      // A paragraph, or a container whose own blocks are what count.
      return blocksOf(element.childNodes)
    }
  }
}

/**
 * A list element as a list, each entry's own text apart from the lists nested in it.
 * @param element The `ul` or `ol`.
 * @returns The list.
 */
function listOf(element: HTMLElement): ListBlock {
  const items = [...element.children]
    .filter((child) => child.tagName === "LI")
    .map((item): ListItem => {
      const nested = [...item.children]
        .filter((child): child is HTMLElement => child.tagName === "UL" || child.tagName === "OL")
        .map((child) => listOf(child))
      const own = [...item.childNodes].filter(
        (child) =>
          !(child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL")),
      )
      return { children: trimmed(inlinesOf(own, plain)), nested }
    })
    .filter((item) => item.children.length > 0 || item.nested.length > 0)
  return { isOrdered: element.tagName === "OL", items, kind: "list" }
}

/**
 * Nodes as runs of text, links, and line breaks, under the emphasis of the elements
 * around them. An element the answer has no use for – a span, a font – gives up its text
 * and nothing else.
 * @param nodes The nodes, in order.
 * @param marks The emphasis inherited from outside them.
 * @returns The inlines.
 */
function inlinesOf(nodes: Iterable<ChildNode>, marks: Marks): Inline[] {
  const inlines: Inline[] = []
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Whitespace collapses the way a browser would draw it, and a non-breaking space is
      // a space, because the editor scatters them where nobody meant one.
      const text = (node.textContent ?? "").replaceAll(/\s+/gu, " ")
      if (text !== "") {
        inlines.push({ ...marks, kind: "text", text })
      }
    } else if (node instanceof HTMLBRElement) {
      inlines.push({ kind: "linebreak" })
    } else if (node instanceof HTMLAnchorElement) {
      const href = safeHref(node.getAttribute("href"))
      const children = inlinesOf(node.childNodes, marks)
      if (href === undefined) {
        inlines.push(...children)
      } else if (children.length > 0) {
        inlines.push({ children, href, kind: "link" })
      }
    } else if (node instanceof HTMLElement) {
      inlines.push(...inlinesOf(node.childNodes, marksOf(node, marks)))
    }
  }
  return inlines
}

/**
 * The emphasis inside an element.
 * @param element The element.
 * @param marks The emphasis outside it.
 * @returns The emphasis inside.
 */
function marksOf(element: HTMLElement, marks: Marks): Marks {
  switch (element.tagName) {
    case "B":
    case "STRONG": {
      return { ...marks, isBold: true }
    }
    case "DEL":
    case "S":
    case "STRIKE": {
      return { ...marks, isStruck: true }
    }
    case "EM":
    case "I": {
      return { ...marks, isItalic: true }
    }
    case "U": {
      return { ...marks, isUnderlined: true }
    }
    default: {
      return marks
    }
  }
}

/**
 * A link's address, resolved against the help center, when it is one a reader can
 * follow – a web page, a mail, or a phone number – and undefined for anything else, a
 * `javascript:` above all.
 * @param href The `href` as written.
 * @returns The address, or undefined.
 */
function safeHref(href: string | null): string | undefined {
  if (href === null || href.trim() === "") {
    return undefined
  }
  try {
    const url = new URL(href.trim(), helpCenter)
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

/**
 * Loose inlines as a paragraph, or undefined when there is no text in them – the editor
 * leaves empty paragraphs to make space, which Campfire's own spacing already does.
 * @param inlines The inlines.
 * @returns The paragraph, or undefined.
 */
function toParagraph(inlines: readonly Inline[]): Block | undefined {
  const children = trimmed(inlines)
  return children.length === 0 ? undefined : { children, kind: "paragraph" }
}

/**
 * Inlines without the line breaks and the spaces at either end, which say nothing at
 * the edge of a block. Empty when nothing but those is there.
 * @param inlines The inlines.
 * @returns The trimmed inlines.
 */
function trimmed(inlines: readonly Inline[]): readonly Inline[] {
  const kept = [...inlines]
  while (kept.length > 0 && isBlank(kept[0])) {
    kept.shift()
  }
  while (kept.length > 0 && isBlank(kept.at(-1))) {
    kept.pop()
  }
  const first = kept[0]
  if (first?.kind === "text") {
    kept[0] = { ...first, text: first.text.trimStart() }
  }
  const last = kept.at(-1)
  if (last?.kind === "text") {
    kept[kept.length - 1] = { ...last, text: last.text.trimEnd() }
  }
  return kept
}

/**
 * Whether an inline adds nothing at a block's edge.
 * @param inline The inline, or undefined past the end.
 * @returns True for a line break or a run of nothing but space.
 */
function isBlank(inline: Inline | undefined): boolean {
  return inline?.kind === "linebreak" || (inline?.kind === "text" && inline.text.trim() === "")
}
