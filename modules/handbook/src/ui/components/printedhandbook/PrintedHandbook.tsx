import { Logo, useTheme, type Theme } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { faqTitle, type FaqFolder } from "../../../model/Faq"
import { isIntroduction, lastChangeIn, type ChapterEntry } from "../../../model/Handbook"
import { pageChangesOf } from "../../../model/news"
import { updatedLine } from "../../changed-on"
import { RichText } from "../richtext/RichText"

import "./PrintedHandbook.css"

export type PrintedHandbookProps = {
  /**
   * The chapters, in reading order.
   */
  readonly chapters: readonly ChapterEntry[]
  /**
   * The FAQ's folders, in reading order, printed after the chapters – none to leave the
   * FAQ out.
   */
  readonly folders: readonly FaqFolder[]
}

/**
 * What a theme's fills are written in. White, but for yellow, where white vanishes and
 * the stylesheet darkens the theme's ink instead – the same mix as its tokens make.
 */
const onBright: Readonly<Record<Theme, string>> = {
  blue: "#fff",
  brown: "#fff",
  green: "#fff",
  red: "#fff",
  yellow: "color-mix(in srgb, #c3900b 50%, black)",
}

/**
 * The sheets the copy prints on: every sheet's margins and what it carries at its foot –
 * who the handbook is for, and the page number on a patch of the theme's color – and the
 * cover's own sheet, the first, run to the paper's edge with no foot.
 *
 * Written by the copy rather than in the stylesheet, for two reasons. A rule for the
 * sheet cannot be limited to a part of the page, and the stylesheet reaches every screen
 * of the application, which would all print on the handbook's sheet. And the foot is
 * drawn outside the page's own elements, so it reads the document's colors rather than
 * those of the themed part the copy stands in, and the theme is named here instead.
 *
 * The cover's sheet is not for WebKit, which gives every sheet the first sheet's
 * margins, so a cover run to the edge would take the margins off every page after it.
 * Nothing asks an engine whether it sets a sheet's margins on its own, so the query asks
 * for a font keyword only WebKit knows. There the cover stays inside the margins every
 * sheet has.
 * @param theme The theme the copy is printed in.
 * @returns The rules.
 */
function sheetsOf(theme: Theme): string {
  // eslint-disable-next-line security/detect-object-injection -- a Theme, never free input
  const written = onBright[theme]
  return `@media print {
  @page {
    margin: 22mm 20mm 26mm;
    size: A4;
    @bottom-left {
      color: #7a7a7a;
      content: "Den svenska kontingenten för WSJ27 Polen";
      font-family: "Bravely Script", cursive;
      font-size: 10pt;
      text-transform: uppercase;
      vertical-align: middle;
    }
    @bottom-right {
      background: var(--color-theme-${theme});
      border-radius: 3mm 0 0 3mm;
      color: ${written};
      content: "Sida " counter(page);
      font-family: "Bravely Script", cursive;
      font-size: 14pt;
      margin: 6mm -20mm 6mm 0;
      padding: 0 20mm 0 6mm;
      text-transform: uppercase;
      vertical-align: middle;
      white-space: nowrap;
    }
  }
  @supports not (font: -apple-system-body) {
    @page :first {
      margin: 0;
      @bottom-left { content: none; }
      @bottom-right { content: none; }
    }
  }
}`
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
 * changed, every chapter from a fresh sheet, and the FAQ last. The only thing on paper,
 * so the browser's own print command prints the handbook rather than the screen, and
 * never shown on screen.
 * @param props The chapters and folders to print.
 * @returns The printed copy.
 */
export function PrintedHandbook(props: PrintedHandbookProps): ReactElement {
  const theme = useTheme()
  const changes = pageChangesOf(props.chapters, new Date())
  const newest = lastChangeIn(props.chapters)

  return (
    <div className="printed-handbook">
      <style>{sheetsOf(theme)}</style>
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
          {props.folders.length === 0 ? null : (
            <li>
              <a href="#print-faq">{faqTitle}</a>
              <ol>
                {props.folders.map((folder) => (
                  <li key={folder.id}>
                    <a href={`#print-faq-${String(folder.id)}`}>{folder.name}</a>
                  </li>
                ))}
              </ol>
            </li>
          )}
        </ol>
      </nav>

      {changes.length === 0 ? null : (
        <section className="printed-changes">
          <h2>Ändringslogg</h2>
          <ul>
            {changes.map((change) => (
              <li key={`${String(change.page.id)}-${change.at}`}>
                <strong>{change.page.title}</strong>{" "}
                <span>{dated.format(new Date(change.at))}</span>
                {change.text === undefined ? null : (
                  <>
                    <br />
                    {change.text}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {props.chapters.map((entry) => (
        <section
          key={entry.chapter.id}
          className="printed-chapter"
          id={`print-${entry.chapter.slug}`}
        >
          <h1>{entry.chapter.name}</h1>
          {entry.pages.map((page) => {
            const updated = updatedLine(page)
            return (
              <section key={page.id} className="printed-page" id={`print-${page.slug}`}>
                {isIntroduction(page, entry) ? null : <h2>{page.title}</h2>}
                {updated === undefined ? null : <p className="printed-changed">{updated}</p>}
                <RichText
                  blocks={page.content}
                  headingLevel={isIntroduction(page, entry) ? 2 : 3}
                  isEager
                />
              </section>
            )
          })}
        </section>
      ))}

      {props.folders.length === 0 ? null : <PrintedFaq folders={props.folders} />}
    </div>
  )
}

type PrintedFaqProps = {
  /**
   * The FAQ's folders, in reading order.
   */
  readonly folders: readonly FaqFolder[]
}

/**
 * The FAQ as the printed handbook's last chapter: where its answers come from, then each
 * folder with its questions and answers.
 * @param props The folders.
 * @returns The chapter.
 */
function PrintedFaq(props: PrintedFaqProps): ReactElement {
  return (
    <section className="printed-chapter" id="print-faq">
      <h1>{faqTitle}</h1>
      <p className="printed-source">Svaren kommer från Scoutsupport, support.scouterna.se.</p>
      {props.folders.map((folder) => (
        <section key={folder.id} className="printed-page" id={`print-faq-${String(folder.id)}`}>
          <h2>{folder.name}</h2>
          {folder.questions.map((question) => (
            <section key={question.id} className="printed-question">
              <h3>{question.title}</h3>
              <RichText blocks={question.answer} headingLevel={4} isEager />
            </section>
          ))}
        </section>
      ))}
    </section>
  )
}
