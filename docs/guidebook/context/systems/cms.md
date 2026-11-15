# The CMS

The CMS is the WSJ27 project's content system, where the contingent management writes the leaders' handbook as chapters and ordered pages. It is built and released outside this repository, and shares Campfire's origin under `/services/cms` ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

## What Campfire uses it for

- **The handbook.** The handbook module reads every published page in one read, with its chapter, its content, and its pictures, and keeps all of it on the device ([ADR 040](/decisions/040-read-the-handbook-from-the-cms-and-the-faq-from-the-help-center)). The CMS publishes the pages openly, so the read needs no session.
- **Who a page is for.** A page the CMS marks as public is also on the public handbook, which anyone may read.
- **What changed.** An editor's note on a page, and when it was written, is what Campfire dates a page by and lists in the change log.
- **The editor.** For the contingent management, a page in Campfire links to the same page in the CMS's editor, which signs them in through the [auth service](./auth-service) and decides for itself who may edit.

A phone that cannot reach it reads the handbook it kept last.

## Locally

The [mock](../../testing/mock) answers the page read with a short seeded handbook in the CMS's own shape. It has no editor, so a link into one leads nowhere locally.
