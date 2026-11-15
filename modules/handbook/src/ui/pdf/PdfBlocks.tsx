import { Image, Link, Text, View } from "@react-pdf/renderer"
import type { ReactElement } from "react"

import {
  plainText,
  type Block,
  type Inline,
  type ListBlock,
  type TableBlock,
} from "../../model/RichText"
import { bodyFace, contentArea, look, type PdfColors } from "./pdf-look"

/**
 * What every part of a document's content is drawn with.
 */
export interface PdfSetting {
  /**
   * The colors the document is set in.
   */
  readonly colors: PdfColors
  /**
   * Tells where in the document an anchor landed, once the sheets are laid out.
   */
  readonly onPlace: (anchor: string, sheet: number) => void
  /**
   * The content's pictures in a form a document can hold, by the address the content
   * names them by. A picture not among them is left out.
   */
  readonly pictures: ReadonlyMap<string, string>
}

export type PdfBlocksProps = {
  /**
   * The anchor a block is reached by, for the blocks the table of contents leads to.
   */
  readonly anchorOf?: (index: number) => string | undefined
  /**
   * The content, in reading order.
   */
  readonly blocks: readonly Block[]
  /**
   * Whether the content is set bold throughout, as a table's header cell is.
   */
  readonly isBold?: boolean
  /**
   * Whether the content sits in a table's cell, where its paragraphs stand flush rather
   * than a line apart.
   */
  readonly isInCell?: boolean
  /**
   * How wide the content may run, in points.
   */
  readonly room?: number
  /**
   * What the content is drawn with.
   */
  readonly setting: PdfSetting
}

/**
 * A stretch of the handbook's content, set for a document: the same blocks the screen
 * draws, in the document's own faces and measures.
 * @param props The content, and what to draw it with.
 * @returns The blocks.
 */
export function PdfBlocks(props: PdfBlocksProps): ReactElement {
  const { anchorOf, blocks, isInCell = false, room = contentArea.width, setting } = props
  const isBold = props.isBold === true
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading": {
            const anchor = anchorOf?.(index)
            return (
              // Kept with what follows, so a heading never ends a sheet.
              <View key={index} minPresenceAhead={36} wrap={false}>
                {anchor === undefined ? null : <Placed anchor={anchor} onPlace={setting.onPlace} />}
                <Text
                  {...(anchor !== undefined && { id: anchor })}
                  style={[look.heading, { fontSize: block.rank === 1 ? 11.5 : 10.5 }]}
                >
                  <Inlines inlines={block.children} isBold setting={setting} />
                </Text>
              </View>
            )
          }
          case "image": {
            return <Picture key={index} block={block} room={room} setting={setting} />
          }
          case "list": {
            return <List key={index} isBold={isBold} list={block} setting={setting} />
          }
          case "paragraph": {
            return plainText(block.children).trim() === "" ? null : (
              <Text key={index} style={isInCell ? {} : look.paragraph}>
                <Inlines inlines={block.children} isBold={isBold} setting={setting} />
              </Text>
            )
          }
          case "quote": {
            return (
              <Text key={index} style={look.quote}>
                <Inlines inlines={block.children} isBold={isBold} isItalic setting={setting} />
              </Text>
            )
          }
          case "table": {
            return <Table key={index} room={room} setting={setting} table={block} />
          }
        }
      })}
    </>
  )
}

export type PlacedProps = {
  /**
   * The anchor to tell the place of.
   */
  readonly anchor: string
  /**
   * Told the sheet the anchor landed on.
   */
  readonly onPlace: (anchor: string, sheet: number) => void
}

/**
 * Nothing on paper: a mark that tells which sheet it landed on, which is how the table
 * of contents learns its page numbers. It takes no room, so it moves nothing.
 * @param props The anchor, and who to tell.
 * @returns The mark.
 */
export function Placed(props: PlacedProps): ReactElement {
  return (
    <Text
      style={look.marker}
      render={({ pageNumber }) => {
        props.onPlace(props.anchor, pageNumber)
        return ""
      }}
    />
  )
}

type InlinesProps = {
  /**
   * The text, as runs, links, and line breaks.
   */
  readonly inlines: readonly Inline[]
  /**
   * Whether the text is bold whatever its runs say, as a heading's is.
   */
  readonly isBold?: boolean
  /**
   * Whether the text is italic whatever its runs say, as a quote's is.
   */
  readonly isItalic?: boolean
  /**
   * What the text is drawn with.
   */
  readonly setting: PdfSetting
}

/**
 * A block's text, with its emphasis and its links.
 * @param props The text.
 * @returns The runs, to sit inside a text.
 */
function Inlines(props: InlinesProps): ReactElement[] {
  const isItalic = props.isItalic === true
  return props.inlines.map((inline, index) => {
    switch (inline.kind) {
      case "linebreak": {
        return <Text key={index}>{"\n"}</Text>
      }
      case "link": {
        return (
          <Link
            key={index}
            src={inline.href}
            style={[look.link, { color: props.setting.colors.ink }]}
          >
            <Inlines inlines={inline.children} isBold isItalic={isItalic} setting={props.setting} />
          </Link>
        )
      }
      case "text": {
        const lines = [
          ...(inline.isUnderlined ? ["underline"] : []),
          ...(inline.isStruck ? ["line-through"] : []),
        ]
        return (
          <Text
            key={index}
            style={{
              fontFamily: bodyFace(
                props.isBold === true || inline.isBold,
                isItalic || inline.isItalic,
              ),
              ...(lines.length > 0 && {
                textDecoration: lines.join(" ") as "line-through" | "underline",
              }),
            }}
          >
            {inline.text}
          </Text>
        )
      }
    }
  })
}

type ListProps = {
  /**
   * Whether the list is set bold throughout.
   */
  readonly isBold: boolean
  /**
   * The list.
   */
  readonly list: ListBlock
  /**
   * What the list is drawn with.
   */
  readonly setting: PdfSetting
}

/**
 * A list, each entry under its mark, with any list nested in an entry under its text.
 * @param props The list.
 * @returns The list.
 */
function List(props: ListProps): ReactElement {
  return (
    <View style={look.list}>
      {props.list.items.map((item, index) => (
        <View key={index} style={look.listItem}>
          <Text style={look.listMarker}>
            {props.list.isOrdered ? `${String(index + 1)}.` : "•"}
          </Text>
          <View style={look.listText}>
            <Text>
              <Inlines inlines={item.children} isBold={props.isBold} setting={props.setting} />
            </Text>
            {item.nested.map((nested, nestedIndex) => (
              <List key={nestedIndex} isBold={props.isBold} list={nested} setting={props.setting} />
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

// A CSS pixel in points, and the tallest a picture may stand on a sheet.
const pointsPerPixel = 0.75
const tallest = 340

type PictureProps = {
  /**
   * The picture.
   */
  readonly block: Extract<Block, { kind: "image" }>
  /**
   * How wide it may run, in points.
   */
  readonly room: number
  /**
   * Where the picture itself is found.
   */
  readonly setting: PdfSetting
}

/**
 * A picture at the size the handbook draws it, or as large as the sheet has room for.
 * @param props The picture.
 * @returns The picture, or nothing when it could not be read.
 */
function Picture(props: PictureProps): ReactElement | null {
  const { block, room } = props
  const source = props.setting.pictures.get(block.src)
  if (source === undefined || block.width <= 0 || block.height <= 0) {
    return null
  }
  const scale = Math.min(
    1,
    room / (block.width * pointsPerPixel),
    tallest / (block.height * pointsPerPixel),
  )
  return (
    <Image
      src={source}
      style={[
        look.image,
        {
          height: block.height * pointsPerPixel * scale,
          width: block.width * pointsPerPixel * scale,
        },
      ]}
    />
  )
}

type TableProps = {
  /**
   * How wide the table may run, in points.
   */
  readonly room: number
  /**
   * What the table is drawn with.
   */
  readonly setting: PdfSetting
  /**
   * The table.
   */
  readonly table: TableBlock
}

// The least and the most text a column is counted as holding, so a column of times is
// not squeezed to nothing beside one of sentences, and that one does not take it all.
const leastText = 6
const mostText = 40

/**
 * A table as a grid, each column given room by how much its cells hold, and a row kept
 * whole on one sheet.
 * @param props The table.
 * @returns The table.
 */
function Table(props: TableProps): ReactElement {
  const { rows } = props.table
  const columnCount = Math.max(0, ...rows.map((row) => row.length))
  const weights = Array.from({ length: columnCount }, (_unused, column) =>
    Math.min(
      mostText,
      Math.max(leastText, ...rows.map((row) => longestLine(row.at(column)?.blocks ?? []))),
    ),
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const inner = props.room - 1
  return (
    <View style={look.table}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={look.tableRow} wrap={false}>
          {weights.map((weight, column) => {
            const cell = row.at(column)
            const width = (inner * weight) / total
            return (
              <View key={column} style={[look.tableCell, { width }]}>
                <PdfBlocks
                  blocks={cell?.blocks ?? []}
                  isBold={cell?.isHeader === true}
                  isInCell
                  room={width - 11}
                  setting={props.setting}
                />
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/**
 * How long the longest stretch of text in a cell is, in letters.
 * @param blocks The cell's content.
 * @returns The length, zero for a cell with no text.
 */
function longestLine(blocks: readonly Block[]): number {
  return Math.max(
    0,
    ...blocks.map((block) => ("children" in block ? plainText(block.children).length : 0)),
  )
}
