# 040. Read the handbook from the CMS and the FAQ from the help center

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-11-15" /></p>
:::

## Context

The contingent management writes the leaders' handbook in the project's CMS, and answers recurring questions in Scouterna's help center, which the support team already runs. Both change without a release, and both are read on a camp site where coverage comes and goes. The CMS shares Campfire's origin under `/services/cms` ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)) and publishes its pages openly. The help center is another origin, publishes each folder as JSON any origin may read, and has no API for listing a category's folders.

## Decision

We read both in the browser, whole, and keep them on the device.

- **The handbook is one read of every page**, converted from the CMS's rich text into Campfire's own model, with its pictures stored inside it.
- **The FAQ is one read per folder, joined into one result**, its answers converted from the help center's HTML into the same model. The folders' ids live in the source.
- **Both go through the query client**, cached and persisted, and are read when the application starts, so all of it is there before anyone opens it.
- **Nothing from either source is rendered as it arrived.** Only what the model can hold reaches the screen.

## Consequences

- An editor's change shows on the next start with a connection, with no service to run and nothing to deploy.
- The whole handbook and FAQ work with no coverage, pictures included, for a few hundred kilobytes on the device.
- The help center learns the reader's address, and its limits and outages are Campfire's. A folder that cannot be read fails the whole FAQ, because one missing folder would look complete.
- A folder added in the help center reaches nobody until its id is added and released.
- Markup the model has no block for is dropped, so a new kind of content in either editor needs a change here.
- `local` cannot serve the FAQ from the mock, and the walk-through answers the help center in the browser instead.

## Alternatives considered

- A service in the project's back-end that serves both – a repository Campfire does not own, for reads that need no access rules.
- Proxying the help center under `/services/` – lets the mock answer and hides the reader's address, for a route in every environment's front door.
- Rendering the sources' own HTML – nothing to convert, and markup Campfire cannot vouch for on a signed-in origin.
- Reading a page or a folder when it is opened – less to fetch at start, and nothing offline that was not opened at home.
