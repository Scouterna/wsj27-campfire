# 036. Virtualize a list that can grow to the contingent's size

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-26" /></p>
:::

## Context

The contingent management reads the list of participants whole – more than 2,600 people in one list, searched and narrowed as they type. Rendering every row was slow: widening a filter mounted thousands of rows at once, which took hundreds of milliseconds on a desktop and several times that on a phone. Rows cannot be given a fixed height either, because their text follows the reader's Dynamic Type size.

## Decision

We virtualize any list that can grow to the contingent's size with TanStack Virtual.

- **Only the rows near the viewport are in the DOM**, so the cost of a list follows the screen, not the number of people in it.
- **Rows are measured, not assumed**, so a row grows with the reader's text size.
- **The list stays one list** – no pages, no cap, and no "load more".

## Consequences

- A filter change costs the same at forty rows as at four thousand.
- Find-in-page cannot find a row scrolled out of the DOM, so the list's own search is the way to find someone.
- A virtualized list needs care for scroll position and focus that a plain list gets for free.

## Alternatives considered

- Paginating or capping the list – a page boundary in a list that is read whole.
- `content-visibility: auto` – no dependency, and measured slower in Safari.
