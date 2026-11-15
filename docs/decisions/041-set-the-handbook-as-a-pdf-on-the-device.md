# 041. Set the handbook as a PDF on the device

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-11-15" /></p>
:::

## Context

Leaders want the handbook as a file to keep, send, and print, looking like the contingent's printed handbook: a full-color cover, a table of contents with page numbers, and a numbered footer. The browser's print dialog can save a PDF, but few people know it, and print CSS cannot give that result in every browser – WebKit gives every sheet the first sheet's margins and has no page margin boxes, so a cover run to the paper's edge and a footer are out of reach there. The handbook is already on the device as Campfire's own model ([ADR 040](040-read-the-handbook-from-the-cms-and-the-faq-from-the-help-center.md)).

## Decision

We set the handbook as a PDF in the browser with `@react-pdf/renderer`, from the same model the screen draws.

- **The library is a chunk of its own**, off the path to every screen. The service worker keeps it with the rest of the application, so a PDF can be made with no connection.
- **The handbook and each appendix are separate documents.** A chapter whose name starts with "Bilaga" is an appendix, since the CMS has no field that says so.
- **The display face is embedded from its font file**, and the body is set in the PDF format's built-in Helvetica.
- **Pictures and the contingent's mark are redrawn on a canvas** into the two formats a PDF holds.
- **The menus offer the PDFs and no printing.** The browser's own print command still prints a plainer copy through print CSS.

## Consequences

- The document looks the same from every browser, works with no connection, and needs no service.
- The content is drawn a third way, beside the screen and the print CSS. A new kind of block needs all three.
- The chunk is about 450 kB compressed. No screen waits for it, but every installed copy fetches it in the background.
- The built-in face holds Western European letters only. Any other letter is swapped for the closest it has – a Polish ń prints as n – and an emoji is left out.
- A shell's web view cannot save a file the page made, so the PDFs are offered in a browser only.

## Alternatives considered

- Rendering the PDF when the handbook is published, in or beside the CMS – the best typography and one file for everyone, for work in a repository Campfire does not own and nothing in the reader's own unit color.
- Print CSS alone – no dependency, and the result differs by browser and is hidden behind the print dialog.
- Drawing the page to a canvas and wrapping the image – text that cannot be searched or selected, and large files.
- Printing the generated PDF from a hidden frame – works in one browser engine and not the others.
