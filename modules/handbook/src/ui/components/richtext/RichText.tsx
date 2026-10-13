import type { ReactElement, ReactNode } from "react"

import type { Block, Inline, ListBlock, TextRun } from "../../../model/RichText"

import "./RichText.css"

export type RichTextProps = {
  /**
   * The content, in reading order.
   */
  readonly blocks: readonly Block[]
  /**
   * The level the content's largest headings take – one below the heading the content
   * sits under, so the page outline nests them beneath it.
   */
  readonly headingLevel: 2 | 3
  /**
   * Whether images load at once rather than as they near the screen – for a copy that is
   * printed, where nothing scrolls into view.
   */
  readonly isEager?: boolean
}

/**
 * A handbook page's content, drawn as the document it is – headings the page outline
 * lists, lists, tables, set-apart passages, and images – in the handbook's reading type.
 * @param props The blocks to draw, and the level of their largest headings.
 * @returns The content.
 */
export function RichText(props: RichTextProps): ReactElement {
  return (
    <div className="richtext">
      {props.blocks.map((block, index) =>
        renderBlock(block, index, props.headingLevel, props.isEager === true),
      )}
    </div>
  )
}

const headingTags = ["h2", "h3", "h4", "h5", "h6"] as const

/**
 * One block as its element.
 * @param block The block.
 * @param index Its place among its siblings, which is its key – the content never
 * reorders under the reader.
 * @param headingLevel The level a heading of the first rank takes.
 * @param isEager Whether images load at once.
 * @returns The element.
 */
function renderBlock(
  block: Block,
  index: number,
  headingLevel: 2 | 3,
  isEager: boolean,
): ReactElement {
  switch (block.kind) {
    case "heading": {
      const Heading = headingTags[headingLevel - 2 + block.rank - 1] ?? "h6"
      return <Heading key={index}>{renderInlines(block.children)}</Heading>
    }
    case "image": {
      return (
        <img
          key={index}
          alt={block.alt}
          height={block.height}
          loading={isEager ? "eager" : "lazy"}
          src={block.src}
          width={block.width}
        />
      )
    }
    case "list": {
      return renderList(block, index)
    }
    case "paragraph": {
      return <p key={index}>{renderInlines(block.children)}</p>
    }
    case "quote": {
      // The handbook's editors set a passage apart to say "remember this", so it is drawn
      // as the design system's reminder rather than as a quotation.
      return (
        <aside key={index} className="richtext-reminder">
          <p>{renderInlines(block.children)}</p>
        </aside>
      )
    }
    case "table": {
      return (
        <div key={index} className="richtext-table">
          <table>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const Cell = cell.isHeader ? "th" : "td"
                    return (
                      <Cell key={cellIndex}>
                        {cell.blocks.map((inner, innerIndex) =>
                          renderBlock(inner, innerIndex, headingLevel, isEager),
                        )}
                      </Cell>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
}

/**
 * A list and the lists nested in its entries.
 * @param list The list.
 * @param index Its place among its siblings.
 * @returns The element.
 */
function renderList(list: ListBlock, index: number): ReactElement {
  const List = list.isOrdered ? "ol" : "ul"
  return (
    <List key={index}>
      {list.items.map((item, itemIndex) => (
        <li key={itemIndex}>
          {renderInlines(item.children)}
          {item.nested.map((nested, nestedIndex) => renderList(nested, nestedIndex))}
        </li>
      ))}
    </List>
  )
}

/**
 * A block's text as elements.
 * @param inlines The inlines.
 * @returns The nodes to place inside the block's element.
 */
function renderInlines(inlines: readonly Inline[]): ReactNode {
  return inlines.map((inline, index) => {
    switch (inline.kind) {
      case "linebreak": {
        return <br key={index} />
      }
      case "link": {
        // A web address opens beside Campfire rather than in its place; a mail or a phone
        // address is handed to its own application either way.
        const isWeb = /^https?:/iu.test(inline.href)
        return (
          <a
            key={index}
            href={inline.href}
            {...(isWeb && { rel: "noopener noreferrer", target: "_blank" })}
          >
            {renderInlines(inline.children)}
          </a>
        )
      }
      case "text": {
        return <Emphasis key={index} run={inline} />
      }
    }
  })
}

type EmphasisProps = {
  /**
   * The run to draw.
   */
  readonly run: TextRun
}

/**
 * A run of text in the emphasis the editor gave it, each emphasis its own element so
 * assistive technology hears what the eye sees.
 * @param props The run.
 * @returns The text, wrapped once per emphasis.
 */
function Emphasis(props: EmphasisProps): ReactElement {
  const { run } = props
  let node: ReactNode = run.text
  if (run.isUnderlined) {
    node = <u>{node}</u>
  }
  if (run.isStruck) {
    node = <s>{node}</s>
  }
  if (run.isItalic) {
    node = <em>{node}</em>
  }
  if (run.isBold) {
    node = <strong>{node}</strong>
  }
  return <>{node}</>
}
