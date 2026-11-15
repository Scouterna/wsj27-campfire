# Scouterna's help center

Scouterna's help center, at `support.scouterna.se`, is where the support team answers recurring questions. The contingent management keeps the questions about WSJ27 there, in folders, and Campfire reads them straight from the browser ([ADR 040](/decisions/040-read-the-handbook-from-the-cms-and-the-faq-from-the-help-center)).

## What Campfire uses it for

- **The FAQ.** The handbook module reads each of the WSJ27 folders as the JSON the help center publishes to any origin, joins them into one FAQ, and keeps it on the device. The folders' ids are in the source, because the help center lists a category's folders nowhere a browser may read.
- **The answers.** An answer is HTML an editor wrote. Campfire converts it into its own model and draws that, never the HTML.

Nothing personal is sent. The help center sees the reader's address.

A phone that cannot reach it reads the FAQ it kept last. A folder that cannot be read fails the whole FAQ, which then says so, while the handbook stays readable.

## Locally

The [mock](../../testing/mock) does not stand in for it, so the local environment reads the real help center. The Playwright walk-throughs answer the folders themselves and keep the browser from finding the real one, and Storybook seeds its own.
