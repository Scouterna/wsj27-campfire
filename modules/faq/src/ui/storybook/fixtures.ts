import type { FaqFolder } from "../../model/Faq"
import type { Inline } from "../../model/RichText"

/**
 * Plain text as one run.
 * @param text The text.
 * @param isBold Whether the run is set in bold.
 * @returns The run.
 */
function run(text: string, isBold = false): Inline {
  return { isBold, isItalic: false, isStruck: false, isUnderlined: false, kind: "text", text }
}

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
              run("kontingentledningen", true),
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
