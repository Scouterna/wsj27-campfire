import { StyleSheet } from "@react-pdf/renderer"

/**
 * The colors a document is set in, which are the reader's unit's – read off the screen,
 * because a PDF has no stylesheet to read them from.
 */
export interface PdfColors {
  /**
   * The unit's color, for the cover and a page's title.
   */
  readonly bright: string
  /**
   * The unit's ink, dark enough for a link in running text.
   */
  readonly ink: string
  /**
   * What is written on the unit's color.
   */
  readonly onBright: string
}

/**
 * The display face's name inside a document.
 */
export const displayFace = "Bravely Script"

/**
 * The body face in the cut a stretch of text asks for. The faces a document carries
 * built in are a family in name only – each cut is a face of its own, and asking the
 * upright one to be bold sets the upright letters at the bold one's widths.
 * @param isBold Whether the text is bold.
 * @param isItalic Whether the text is italic.
 * @returns The face's name.
 */
export function bodyFace(isBold: boolean, isItalic: boolean): string {
  if (isBold) {
    return isItalic ? "Helvetica-BoldOblique" : "Helvetica-Bold"
  }
  return isItalic ? "Helvetica-Oblique" : "Helvetica"
}

// An A4 sheet and its margins, in points, as the printed handbook sets them.
const sheetWidth = 595.28
const sheetHeight = 841.89
const pointsPerMm = 72 / 25.4

/**
 * The sheet's margins, in points.
 */
export const margin = {
  bottom: 26 * pointsPerMm,
  side: 20 * pointsPerMm,
  top: 22 * pointsPerMm,
} as const

/**
 * The room a sheet leaves for content between its margins, in points.
 */
export const contentArea = {
  height: sheetHeight - margin.top - margin.bottom,
  width: sheetWidth - margin.side * 2,
} as const

const ink = "#1a1a1a"
const quiet = "#7a7a7a"

/**
 * How the document's parts are set, the colors left to whoever draws them.
 */
export const look = StyleSheet.create({
  body: {
    color: ink,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.5,
    paddingBottom: margin.bottom,
    paddingHorizontal: margin.side,
    paddingTop: margin.top,
  },
  changed: { color: quiet, fontSize: 9, marginBottom: 6, marginTop: -4 },
  changeDate: { color: quiet },
  changeEntry: { marginBottom: 7 },
  chapterTitle: {
    fontFamily: displayFace,
    fontSize: 58,
    lineHeight: 1.05,
    marginBottom: 22,
    marginTop: 30,
    textTransform: "uppercase",
  },
  contentsColumn: { width: (contentArea.width - 12 * pointsPerMm) / 2 },
  contentsColumns: { flexDirection: "row", justifyContent: "space-between" },
  contentsHeading: {
    fontFamily: displayFace,
    fontSize: 13,
    lineHeight: 1,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  contentsLeader: {
    borderBottomColor: ink,
    borderBottomStyle: "dotted",
    borderBottomWidth: 1,
    flexGrow: 1,
    marginBottom: 3.5,
    marginHorizontal: 2,
    minWidth: 8,
  },
  contentsLine: { alignItems: "flex-end", flexDirection: "row" },
  contentsLink: { color: ink, flexShrink: 1, textDecoration: "none" },
  cover: { paddingHorizontal: margin.side, paddingTop: 78 * pointsPerMm },
  coverLogo: {
    bottom: 12 * pointsPerMm,
    position: "absolute",
    right: 12 * pointsPerMm,
    width: 60 * pointsPerMm,
  },
  coverNote: { fontFamily: displayFace, fontSize: 14, textTransform: "uppercase" },
  coverTitle: {
    fontFamily: displayFace,
    fontSize: 60,
    lineHeight: 1,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  foot: {
    bottom: 0,
    height: margin.bottom + 8,
    left: 0,
    position: "absolute",
    right: 0,
  },
  footLine: {
    color: quiet,
    fontFamily: displayFace,
    fontSize: 10,
    lineHeight: 1.45,
    textTransform: "uppercase",
  },
  footLines: { bottom: 11 * pointsPerMm, left: margin.side, position: "absolute" },
  footNumber: {
    fontFamily: displayFace,
    fontSize: 14,
    lineHeight: 1,
    position: "absolute",
    right: 9 * pointsPerMm,
    textTransform: "uppercase",
    top: 26,
  },
  footTab: { bottom: 7 * pointsPerMm, height: 62, position: "absolute", right: 0, width: 96 },
  heading: { fontFamily: "Helvetica-Bold", marginBottom: 5, marginTop: 12 },
  image: { marginBottom: 9, marginTop: 3 },
  link: { textDecoration: "underline" },
  list: { marginBottom: 8 },
  listItem: { flexDirection: "row", marginBottom: 2 },
  listMarker: { width: 16 },
  listText: { flex: 1 },
  marker: { fontSize: 1, height: 0, lineHeight: 0 },
  pageTitle: {
    fontFamily: displayFace,
    fontSize: 24,
    lineHeight: 1.15,
    marginBottom: 8,
    marginTop: 24,
    textTransform: "uppercase",
  },
  paragraph: { marginBottom: 8 },
  quote: {
    borderLeftColor: quiet,
    borderLeftWidth: 2,
    marginBottom: 8,
    paddingLeft: 10,
  },
  table: { fontSize: 9.5, lineHeight: 1.35, marginBottom: 10, marginTop: 3 },
  tableCell: {
    borderBottomWidth: 0.75,
    borderColor: ink,
    borderRightWidth: 0.75,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  // Each row carries its own rule above and to its left, drawn over the rule under the
  // row before it, so a table broken across two sheets is closed on both.
  tableRow: {
    borderColor: ink,
    borderLeftWidth: 0.75,
    borderTopWidth: 0.75,
    flexDirection: "row",
    marginTop: -0.75,
  },
})

/**
 * What a line of the table of contents takes of a column, by how deep it sits.
 */
export const contentsLook = {
  1: { fontSize: 10, gapAbove: 12, indent: 0 },
  2: { fontSize: 9.5, gapAbove: 5, indent: 10 },
  3: { fontSize: 9.5, gapAbove: 1, indent: 20 },
} as const

/**
 * How tall a line of the table of contents' text is, in points.
 */
export const contentsLineHeight = 13
