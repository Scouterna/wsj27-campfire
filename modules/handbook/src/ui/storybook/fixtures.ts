import type { Chapter, HandbookPage } from "../../model/Handbook"
import type { Block, Inline } from "../../model/RichText"

/**
 * Plain text, as a run with no emphasis.
 * @param text The text.
 * @param emphasis The emphasis to give it.
 * @returns The run.
 */
function run(text: string, emphasis: Partial<Record<"isBold" | "isItalic", boolean>> = {}): Inline {
  return {
    isBold: false,
    isItalic: false,
    isStruck: false,
    isUnderlined: false,
    kind: "text",
    text,
    ...emphasis,
  }
}

const welcome: Chapter = { id: 1, name: "Välkommen", order: 0, slug: "valkommen" }
const travel: Chapter = { id: 2, name: "Resa", order: 20, slug: "resa" }

/**
 * Every kind of block the handbook draws, in one page's worth of content.
 */
export const everyBlock: readonly Block[] = [
  {
    children: [
      run("Under resan håller avdelningen kontakten i "),
      run("Discord", { isBold: true }),
      run("."),
    ],
    kind: "paragraph",
  },
  { children: [run("Kanalerna")], kind: "heading", rank: 1 },
  {
    kind: "table",
    rows: [
      [
        { blocks: [{ children: [run("Kanal")], kind: "paragraph" }], isHeader: true },
        { blocks: [{ children: [run("Vad du gör där")], kind: "paragraph" }], isHeader: true },
      ],
      [
        { blocks: [{ children: [run("#alla-ledare")], kind: "paragraph" }], isHeader: false },
        {
          blocks: [
            {
              children: [run("Fri diskussion mellan alla ledare och CMT. Skrivpaus 5 sekunder.")],
              kind: "paragraph",
            },
          ],
          isHeader: false,
        },
      ],
    ],
  },
  { children: [run("Innan ni åker")], kind: "heading", rank: 2 },
  {
    isOrdered: true,
    items: [
      {
        children: [run("Packa efter listan.")],
        nested: [
          {
            isOrdered: false,
            items: [
              { children: [run("Sovsäck")], nested: [] },
              { children: [run("Liggunderlag")], nested: [] },
            ],
            kind: "list",
          },
        ],
      },
      { children: [run("Kolla passet.")], nested: [] },
    ],
    kind: "list",
  },
  { children: [run("Ring alltid 112 först.")], kind: "quote" },
  {
    children: [
      run("Maila "),
      {
        children: [run("wsj.units@scouterna.se")],
        href: "mailto:wsj.units@scouterna.se",
        kind: "link",
      },
      run(" eller läs "),
      {
        children: [run("jamboreens webbplats")],
        href: "https://www.jamboree2027.org/",
        kind: "link",
      },
      run("."),
    ],
    kind: "paragraph",
  },
  {
    children: [run("Kanalerna skapas när avdelningen är klar.", { isItalic: true })],
    kind: "paragraph",
  },
]

/**
 * A short handbook: two chapters, one page carrying every kind of block, and change
 * notes on two pages.
 */
export const handbook: readonly HandbookPage[] = [
  {
    chapter: welcome,
    content: [
      {
        children: [run("Den här handboken är till för dig som är avdelningsledare.")],
        kind: "paragraph",
      },
    ],
    id: 1,
    position: 0,
    slug: "vad-ar-handboken",
    title: "Vad är handboken?",
  },
  {
    change: { at: "2026-09-23T07:35:27.912Z", text: "Ny adress till avdelningssupporten." },
    chapter: welcome,
    content: [{ children: [run("Varje avdelning får kontaktpersoner i CMT.")], kind: "paragraph" }],
    id: 3,
    position: 20,
    slug: "kontaktinformation",
    title: "Kontaktinformation",
  },
  {
    change: { at: "2026-09-23T07:35:30.912Z", text: "Ny tabell över kanalerna i Discord." },
    chapter: travel,
    content: everyBlock,
    id: 12,
    position: 20_020,
    slug: "hall-kontakten-under-resan",
    title: "Håll kontakten under resan",
  },
]
