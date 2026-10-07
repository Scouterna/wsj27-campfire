import { Logo } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { isIntroduction, type ChapterEntry } from "../../../model/Handbook"
import { RichText } from "../richtext/RichText"

import "./PrintedHandbook.css"

export type PrintedHandbookProps = {
  /**
   * The chapters, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * Whether this is the whole handbook, with its cover, contents, and changelog – or
   * chapters printed on their own.
   */
  readonly isWhole: boolean
}

// The day in Sweden, with its year, because a printed copy is read long after it was
// printed.
const dated = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Stockholm",
  year: "numeric",
})

/**
 * The handbook as it prints: a cover in the reader's own unit color, the contents, what
 * changed, and every chapter from a fresh sheet – or, for a chapter printed on its own,
 * the chapter alone. Invisible on screen and the only
 * thing on paper, so printing the page – from the menu or the browser's own command –
 * prints the handbook rather than the screen.
 * @param props The chapters to print, and whether they are the whole handbook.
 * @returns The printed copy.
 */
export function PrintedHandbook(props: PrintedHandbookProps): ReactElement {
  const changes = props.chapters
    .flatMap((entry) =>
      entry.pages.flatMap((page) =>
        page.change === undefined ? [] : [{ change: page.change, page }],
      ),
    )
    .toSorted((a, b) => b.change.at.localeCompare(a.change.at))
  const newest = changes[0]?.change.at

  return (
    <div className="printed-handbook">
      {props.isWhole ? (
        <>
          <section className="printed-cover">
            <h1>Handboken</h1>
            {newest === undefined ? null : <p>Uppdaterad {dated.format(new Date(newest))}</p>}
            <div className="printed-cover-logo">
              <Logo />
            </div>
          </section>

          <nav className="printed-contents" aria-label="Innehållsförteckning">
            <h2>Innehållsförteckning</h2>
            <ol>
              {props.chapters.map((entry) => (
                <li key={entry.chapter.id}>
                  <a href={`#print-${entry.chapter.slug}`}>{entry.chapter.name}</a>
                  <ol>
                    {entry.pages
                      .filter((page) => !isIntroduction(page, entry))
                      .map((page) => (
                        <li key={page.id}>
                          <a href={`#print-${page.slug}`}>{page.title}</a>
                        </li>
                      ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>

          {changes.length === 0 ? null : (
            <section className="printed-changes">
              <h2>Ändringslogg</h2>
              <ul>
                {changes.map(({ change, page }) => (
                  <li key={page.id}>
                    <strong>{page.title}</strong> <span>{dated.format(new Date(change.at))}</span>
                    <br />
                    {change.text}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}

      {props.chapters.map((entry) => (
        <section
          key={entry.chapter.id}
          className="printed-chapter"
          id={`print-${entry.chapter.slug}`}
        >
          <h1>{entry.chapter.name}</h1>
          {entry.pages.map((page) => (
            <section key={page.id} className="printed-page" id={`print-${page.slug}`}>
              {isIntroduction(page, entry) ? null : <h2>{page.title}</h2>}
              <RichText
                blocks={page.content}
                headingLevel={isIntroduction(page, entry) ? 2 : 3}
                isEager
              />
            </section>
          ))}
        </section>
      ))}
    </div>
  )
}
