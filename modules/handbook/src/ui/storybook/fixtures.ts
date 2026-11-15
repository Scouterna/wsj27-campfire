import type { FaqFolder } from "../../model/Faq"
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
    isPublic: true,
    position: 0,
    slug: "vad-ar-handboken",
    title: "Vad är handboken?",
  },
  {
    change: { at: "2026-09-23T07:35:27.912Z", text: "Ny adress till avdelningssupporten." },
    chapter: welcome,
    content: [{ children: [run("Varje avdelning får kontaktpersoner i CMT.")], kind: "paragraph" }],
    id: 3,
    isPublic: false,
    position: 20,
    slug: "kontaktinformation",
    title: "Kontaktinformation",
  },
  {
    change: { at: "2026-09-23T07:35:30.912Z", text: "Ny tabell över kanalerna i Discord." },
    chapter: travel,
    content: everyBlock,
    id: 12,
    isPublic: true,
    position: 20_020,
    slug: "hall-kontakten-under-resan",
    title: "Håll kontakten under resan",
  },
]

/**
 * The folders as written, out of order on purpose, as the help center may list them.
 */
const unsorted: readonly FaqFolder[] = [
  {
    id: 1,
    name: "Resa och säkerhet",
    position: 3,
    questions: [
      {
        answer: [
          {
            children: [
              run("Resan arrangeras av "),
              run("kontingentledningen", { isBold: true }),
              run(" tillsammans med en resebyrå."),
            ],
            kind: "paragraph",
          },
        ],
        id: 11,
        title: "Vilka arrangerar min resa?",
      },
      {
        answer: [
          { children: [run("Rundresan är ungefär två veckor lång.")], kind: "paragraph" },
          {
            isOrdered: false,
            items: [
              { children: [run("Några dagar i en europeisk stad")], nested: [] },
              { children: [run("Själva jamboreen i Gdansk")], nested: [] },
            ],
            kind: "list",
          },
        ],
        // Published days before the story is looked at, so it is always news.
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        id: 12,
        title: "Hur lång är rundresan?",
      },
    ],
  },
  {
    id: 2,
    name: "Ansökan och kostnader",
    position: 2,
    questions: [
      {
        answer: [
          { children: [run("Betalningen sker enligt följande plan:")], kind: "paragraph" },
          {
            kind: "table",
            rows: [
              [
                { blocks: [{ children: [run("Rundresa")], kind: "paragraph" }], isHeader: false },
                { blocks: [{ children: [run("Direktresa")], kind: "paragraph" }], isHeader: false },
              ],
              [
                {
                  blocks: [{ children: [run("3500 kr vid ansökan")], kind: "paragraph" }],
                  isHeader: false,
                },
                {
                  blocks: [{ children: [run("3500 kr vid ansökan")], kind: "paragraph" }],
                  isHeader: false,
                },
              ],
            ],
          },
          {
            children: [
              run("Frågor om fakturor går till "),
              {
                children: [run("support@scouterna.se")],
                href: "mailto:support@scouterna.se",
                kind: "link",
              },
              run("."),
            ],
            kind: "paragraph",
          },
        ],
        id: 21,
        title: "Hur sker betalningen för lägret?",
      },
    ],
  },
]

/**
 * Two folders in the help center's shape, in reading order, with an answer of every kind
 * of block the help center's editor writes.
 */
export const faqFolders: readonly FaqFolder[] = unsorted.toSorted((a, b) => a.position - b.position)
