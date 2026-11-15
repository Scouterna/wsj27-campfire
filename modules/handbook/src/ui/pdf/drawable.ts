import type { HandbookDocument } from "../../model/documents"
import type { Block, Inline, ListBlock } from "../../model/RichText"

// What the body face draws beyond Latin-1: the marks Windows' Western code page adds,
// which are the ones the format's built-in faces carry.
const beyondLatin1 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ")

// Letters and marks the face lacks that have no accent to drop, and what stands in for
// each. Anything else it lacks is reduced to its base letter, or left out.
const standIns = new Map([
  ["ł", "l"],
  ["Ł", "L"],
  ["đ", "d"],
  ["Đ", "D"],
  ["ı", "i"],
  ["→", "->"],
  ["←", "<-"],
  ["↔", "<->"],
  ["≤", "<="],
  ["≥", ">="],
  ["−", "-"],
  ["‐", "-"],
  ["‑", "-"],
  [" ", " "],
  [" ", " "],
  [" ", " "],
  [" ", " "],
])

/**
 * Whether the body face has a letter.
 * @param letter One letter.
 * @returns True when the face draws it.
 */
function isDrawn(letter: string): boolean {
  const code = letter.codePointAt(0) ?? 0
  return (
    letter === "\n" ||
    (code >= 0x20 && code <= 0x7e) ||
    (code >= 0xa0 && code <= 0xff) ||
    beyondLatin1.has(letter)
  )
}

/**
 * Text as the body face can draw it. The format's built-in faces hold Western European
 * letters and little else, and a letter outside them is not left blank but drawn as
 * other letters, garbling the word it is in. So such a letter is swapped for the closest
 * the face has – a Polish ń for n – and one with nothing close, an emoji, is left out.
 * @param text The text.
 * @returns The text, in letters the face has.
 */
export function drawable(text: string): string {
  let drawn = ""
  for (const letter of text) {
    if (isDrawn(letter)) {
      drawn += letter
      continue
    }
    const standIn = standIns.get(letter)
    if (standIn !== undefined) {
      drawn += standIn
      continue
    }
    // Taken apart into its base letter and its accents, of which the base is kept.
    for (const part of letter.normalize("NFD")) {
      if (isDrawn(part)) {
        drawn += part
      }
    }
  }
  return drawn
}

/**
 * A document with every word in it as the body face can draw it.
 * @param document The document.
 * @returns The same document, its text drawable.
 */
export function drawableDocument(document: HandbookDocument): HandbookDocument {
  return {
    ...document,
    chapters: document.chapters.map((entry) => ({
      ...entry,
      chapter: { ...entry.chapter, name: drawable(entry.chapter.name) },
      pages: entry.pages.map((page) => ({
        ...page,
        chapter: { ...page.chapter, name: drawable(page.chapter.name) },
        content: page.content.map((block) => drawableBlock(block)),
        title: drawable(page.title),
        ...(page.change !== undefined && {
          change: { ...page.change, text: drawable(page.change.text) },
        }),
      })),
    })),
    title: drawable(document.title),
  }
}

/**
 * A block with its text drawable.
 * @param block The block.
 * @returns The block.
 */
function drawableBlock(block: Block): Block {
  switch (block.kind) {
    case "heading":
    case "paragraph":
    case "quote": {
      return { ...block, children: block.children.map((inline) => drawableInline(inline)) }
    }
    case "image": {
      return block
    }
    case "list": {
      return drawableList(block)
    }
    case "table": {
      return {
        ...block,
        rows: block.rows.map((row) =>
          row.map((cell) => ({
            ...cell,
            blocks: cell.blocks.map((inner) => drawableBlock(inner)),
          })),
        ),
      }
    }
  }
}

/**
 * A list with its text drawable, the lists nested in it included.
 * @param list The list.
 * @returns The list.
 */
function drawableList(list: ListBlock): ListBlock {
  return {
    ...list,
    items: list.items.map((item) => ({
      children: item.children.map((inline) => drawableInline(inline)),
      nested: item.nested.map((nested) => drawableList(nested)),
    })),
  }
}

/**
 * A stretch of text with its words drawable.
 * @param inline The inline.
 * @returns The inline.
 */
function drawableInline(inline: Inline): Inline {
  switch (inline.kind) {
    case "linebreak": {
      return inline
    }
    case "link": {
      return { ...inline, children: inline.children.map((child) => drawableInline(child)) }
    }
    case "text": {
      return { ...inline, text: drawable(inline.text) }
    }
  }
}
