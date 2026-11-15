import { Document, Image, Link, Page, Polygon, Svg, Text, View } from "@react-pdf/renderer"
import { Fragment, type ReactElement } from "react"

import {
  blockAnchor,
  changedPages,
  chapterAnchor,
  contentsOf,
  pageAnchor,
  type HandbookDocument,
} from "../../model/documents"
import { isIntroduction, type ChapterEntry } from "../../model/Handbook"
import { columnsOf, type ColumnLine } from "./contents-columns"
import { bodyFace, contentArea, contentsLineHeight, contentsLook, look } from "./pdf-look"
import { PdfBlocks, Placed, type PdfSetting } from "./PdfBlocks"

export type HandbookPdfProps = {
  /**
   * The document to set.
   */
  readonly document: HandbookDocument
  /**
   * The contingent's mark for the cover, in a form a document can hold, when it could be
   * read.
   */
  readonly logo?: string | undefined
  /**
   * The sheet each anchor landed on the last time the document was laid out, which is
   * what the table of contents numbers its lines by. Empty the first time.
   */
  readonly placed: ReadonlyMap<string, number>
  /**
   * The colors, the pictures, and who to tell where the anchors land.
   */
  readonly setting: PdfSetting
}

// Swedish time, with the year, because a document is read long after it was made.
const dated = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Stockholm",
  year: "numeric",
})

// The room the table of contents' heading takes of the first sheet's columns.
const contentsHeadingRoom = 30

/**
 * The handbook, or one of its appendices, as a document set the way the contingent's
 * printed handbook is: a cover in the unit's color, the table of contents with page
 * numbers, what changed, and every chapter from a fresh sheet, each sheet with the
 * contingent's name and its number at its foot.
 * @param props The document, and what to set it with.
 * @returns The document.
 */
export function HandbookPdf(props: HandbookPdfProps): ReactElement {
  const { document, setting } = props
  const { colors } = setting
  const changes = changedPages(document)
  const newest = changes[0]?.change.at
  const updated = newest === undefined ? undefined : `Uppdaterad ${dated.format(new Date(newest))}`
  const columns = columnsOf(contentsOf(document), {
    firstHeight: contentArea.height - contentsHeadingRoom,
    height: contentArea.height,
    width: look.contentsColumn.width,
  })
  const sheets = Array.from({ length: Math.ceil(columns.length / 2) }, (_unused, sheet) =>
    columns.slice(sheet * 2, sheet * 2 + 2),
  )

  return (
    <Document
      author="Den svenska kontingenten för WSJ27"
      language="sv"
      title={updated === undefined ? document.title : `${document.title} – ${updated}`}
    >
      <Page
        size="A4"
        style={[look.cover, { backgroundColor: colors.bright, color: colors.onBright }]}
      >
        <Text style={look.coverTitle}>{document.title}</Text>
        {updated === undefined ? null : <Text style={look.coverNote}>{updated}</Text>}
        {props.logo === undefined ? null : <Image src={props.logo} style={look.coverLogo} />}
      </Page>

      <Page size="A4" style={look.body}>
        {sheets.map((pair, sheet) => (
          <View key={sheet} break={sheet > 0}>
            {sheet === 0 ? <Text style={look.contentsHeading}>Innehållsförteckning</Text> : null}
            <View style={look.contentsColumns}>
              {pair.map((column, index) => (
                <View key={index} style={look.contentsColumn}>
                  {column.map((placed) => (
                    <Line key={placed.line.anchor} placed={placed} sheet={props.placed} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        {changes.length === 0 ? null : (
          <View break={sheets.length > 0}>
            <Text style={[look.pageTitle, { color: colors.bright, marginTop: 0 }]}>
              Ändringslogg
            </Text>
            {changes.map((page) => (
              <View key={page.id} style={look.changeEntry} wrap={false}>
                <Text>
                  <Text style={{ fontFamily: bodyFace(true, false) }}>{page.title}</Text>
                  <Text style={look.changeDate}> {dated.format(new Date(page.change.at))}</Text>
                </Text>
                <Text>{page.change.text}</Text>
              </View>
            ))}
          </View>
        )}

        {document.chapters.map((entry) => (
          <Chapter key={entry.chapter.id} entry={entry} setting={setting} />
        ))}

        <View fixed style={look.foot}>
          <View style={look.footLines}>
            <Text style={look.footLine}>Den svenska kontingenten för WSJ27 Polen</Text>
            <Text style={look.footLine}>
              {updated === undefined ? document.title : `${document.title} · ${updated}`}
            </Text>
          </View>
          {/* The number on a patch of the unit's color, torn rather than cut, as the
              printed handbook's is. */}
          <View style={look.footTab}>
            <Svg height="100%" viewBox="0 0 96 62" width="100%">
              <Polygon fill={colors.bright} points="12,8 96,0 96,62 10,58 0,56 3,34 9,31" />
            </Svg>
            <Text
              style={[look.footNumber, { color: colors.onBright }]}
              render={({ pageNumber }) => `Sida ${String(pageNumber)}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  )
}

type LineProps = {
  /**
   * The line, with the room it has in its column.
   */
  readonly placed: ColumnLine
  /**
   * The sheet each anchor landed on, when known.
   */
  readonly sheet: ReadonlyMap<string, number>
}

/**
 * One line of the table of contents: its title, leading to its place in the document,
 * dots, and the number of the sheet it is on.
 * @param props The line.
 * @returns The line.
 */
function Line(props: LineProps): ReactElement {
  const { line } = props.placed
  const { fontSize, gapAbove, indent } = contentsLook[line.level]
  const number = props.sheet.get(line.anchor)
  return (
    <View style={{ paddingLeft: indent, paddingTop: gapAbove }}>
      <View
        style={[
          look.contentsLine,
          {
            fontSize,
            lineHeight: contentsLineHeight / fontSize,
            fontFamily: bodyFace(line.level === 1, line.level === 2),
            ...(line.level === 1 && { textTransform: "uppercase" }),
          },
        ]}
      >
        <Link src={`#${line.anchor}`} style={look.contentsLink}>
          {line.title}
        </Link>
        <View style={look.contentsLeader} />
        <Text>{number === undefined ? "" : String(number)}</Text>
      </View>
    </View>
  )
}

type ChapterProps = {
  /**
   * The chapter.
   */
  readonly entry: ChapterEntry
  /**
   * What the chapter is drawn with.
   */
  readonly setting: PdfSetting
}

/**
 * A chapter from a fresh sheet: its name in the display face at full size, then each of
 * its pages under its title in the unit's color.
 * @param props The chapter.
 * @returns The chapter.
 */
function Chapter(props: ChapterProps): ReactElement {
  const { entry, setting } = props
  return (
    <View break>
      <Placed anchor={chapterAnchor(entry)} onPlace={setting.onPlace} />
      <Text id={chapterAnchor(entry)} style={look.chapterTitle}>
        {entry.chapter.name}
      </Text>
      {entry.pages.map((page) => (
        // Not a box of its own, because a title is only kept with what follows it when
        // something stands before it in the box they share – and in a box of the page's
        // own the title would stand first.
        <Fragment key={page.id}>
          {isIntroduction(page, entry) ? null : (
            <View minPresenceAhead={70} wrap={false}>
              <Placed anchor={pageAnchor(page)} onPlace={setting.onPlace} />
              <Text
                id={pageAnchor(page)}
                style={[look.pageTitle, { color: setting.colors.bright }]}
              >
                {page.title}
              </Text>
              {page.change === undefined ? null : (
                <Text style={look.changed}>
                  Uppdaterad {dated.format(new Date(page.change.at))}
                </Text>
              )}
            </View>
          )}
          <PdfBlocks
            anchorOf={(index) => blockAnchor(page, index)}
            blocks={page.content}
            setting={setting}
          />
        </Fragment>
      ))}
    </View>
  )
}
