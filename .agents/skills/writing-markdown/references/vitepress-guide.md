# VitePress guidebook guide

The software guidebook under `docs/` is a [VitePress](https://vitepress.dev) site. Its pages are Markdown, but VitePress adds syntax the plain repository view does not render, and the same files are read in two places – the guidebook when built, and as plain Markdown when the repository is browsed on GitHub. This guide covers what the guidebook adds, how a page joins it, and where each feature does and does not render. The rule it serves is in `docs/AGENTS.md`: a guidebook page is read in the site, a decision record is read in both.

## Contents

- [Where it lives and how to run it](#where-it-lives-and-how-to-run-it)
- [The chapters and how a page joins them](#the-chapters-and-how-a-page-joins-them)
- [Frontmatter](#frontmatter)
- [Containers](#containers)
- [Badges](#badges)
- [Includes](#includes)
- [Code blocks](#code-blocks)
- [Mermaid diagrams](#mermaid-diagrams)
- [Links between pages](#links-between-pages)
- [Embedding Vue](#embedding-vue)
- [What renders where](#what-renders-where)

## Where it lives and how to run it

- Content lives under `docs/` – the guidebook chapters in `docs/guidebook/`, the ADR log in `docs/decisions/`, and the agent pages in `docs/guidebook/agents/`.
- The config is `config/vitepress/config.ts`, re-exported by `docs/.vitepress/config.ts` because VitePress mandates that path. All real configuration sits under `config/` with the other tooling.
- `pnpm start:guidebook` runs the dev server with hot reload, on port 3001. `pnpm build:guidebook` builds into `.build/docs`. `pnpm clean` removes `.build`.

The site uses `cleanUrls`, so a page's URL drops the `.md` extension, and `withMermaid`, so Mermaid fences render as diagrams. A `rewrites` rule promotes `docs/guidebook/**` to the site root, so the Introduction serves at `/` and each chapter folder at `/<chapter>/`, while `docs/decisions/` keeps its own path and serves at `/decisions/`. The whole site is published under the `/wsj27-campfire/` base, which is the repository name on GitHub Pages.

`srcExclude` keeps four things out of the build: `decisions/template.md`, which is authoring scaffolding rather than a record; `architecture/**`, which is the C4 model – the DSL, its authoring guide, and the exported diagrams, of which only the SVGs belong on the site, as assets the chapters embed; and every `AGENTS.md` and `CLAUDE.md`, which are conventions rather than chapters.

The build fails on a dead internal link. That is the one link check in the toolchain, so a page that links to a slug that does not exist stops `pnpm build:guidebook` rather than shipping.

## The chapters and how a page joins them

The guidebook is ten chapters plus the decision log, in this reading order. The second column is the slug list in `config/vitepress/config.ts`, which is what a chapter's pages are wired by:

| Chapter      | Pages                                                                                           |
| :----------- | :---------------------------------------------------------------------------------------------- |
| Introduction | –                                                                                               |
| Context      | `context/people/*` (nine), `context/systems/*` (four)                                           |
| Process      | –                                                                                               |
| Requirements | `scope`, `constraints`, `quality`                                                               |
| Architecture | `code-organization`, `applications`, `modules`, `layers/*`, `example-flows/*`                   |
| Design       | –                                                                                               |
| Development  | `setup`, `layout`, `environments`, `scripts`, `checks`, `continuous-integration`, `conventions` |
| Testing      | `mock`, `unit`, `ui`                                                                            |
| Maintenance  | `release`, `monitoring`                                                                         |
| Glossary     | –                                                                                               |
| Decisions    | One page per ADR, read from disk                                                                |

The Layers group is `domain`, `data`, `presentation`, and `navigation`; Example flows is `sign-in` and `show-participants`. Both nest under Architecture in the sidebar.

Every chapter is a directory with an `index.md`, and a chapter with parts has one page per part.

A guidebook page is wired into the sidebar by hand: add its slug to its chapter's list in `config/vitepress/config.ts` – `chapterPages("development", […])`, or `chapterPages("context/people", […])` and its sibling for a person or a system. The list order is the reading order, and it is the one thing a new page adds to that file. The link text is read from the page's H1, so a renamed page needs no edit there.

The ADRs and the agent pages join differently. The ADRs are read from `docs/decisions/` at config load, in filename order, so a new record joins by existing – match `NNN-slug.md` and nothing needs editing. An agent page is listed in the `agents` array beside them, in the order the Process chapter lists them. Neither is in the sidebar – they hang off the table in their own chapter – so VitePress finds no neighbors for them and `transformPageData` builds their prev and next links itself: the agents chain out of the Process chapter and back to it, the ADRs chain through the log in number order and stop at the last one.

This puts a load on the H1: it is the sidebar label and the link text in both chains. Keep it short and descriptive, and keep the `NNN.` number prefix on an ADR's H1, because the config strips only the `#` marker.

## Frontmatter

A page may open with YAML frontmatter. The common key is `title`:

```yaml
---
title: The release model
---
```

VitePress renders a frontmatter `title` into the page `<title>`, not as the page's H1. That is why the markdownlint config sets `MD025 front_matter_title ""` – a page may carry both a frontmatter `title` and a single `#` H1 without failing. No guidebook page carries frontmatter today; the H1 is enough.

## Containers

VitePress custom containers are callouts. They are guidebook-only – in the plain GitHub view they show as literal `:::` lines.

```text
::: tip
A helpful aside.
:::

::: warning
Something to be careful about.
:::

::: danger
A serious caveat.
:::

::: info
Neutral context.
:::

::: details Click to expand
Collapsed content.
:::
```

A container takes an optional custom title after the type: `::: tip Worth knowing`. VitePress also renders GitHub alert blockquotes (`> [!NOTE]`), so those are the callout that travels to both targets; reach for a container when the page needs `details`, a custom title, or a type the alerts do not have.

One container carries a convention here, and it is titled. The guidebook describes the first version as built, so no container on a guidebook page marks code the tree has not reached.

- `::: info Status` – the block every decision record opens with, holding the status and date badges. It is the standing exception to the guidebook-only rule: a record is read on GitHub too, and this construct stays anyway.

A record whose surroundings changed later carries a second one, `::: warning Paths changed` or similar, saying what a later record moved and that the decision itself is unchanged. That note, and the status badge that changes when a later record supersedes it, are the only two ways an accepted record is ever amended.

## Badges

`Badge` is a built-in VitePress component, and one of the three elements `MD033` allows. The decision records use it for the status block:

```text
::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-08-15" /></p>
:::
```

The types are `info`, `tip`, `warning`, and `danger`. The four ADR statuses map onto them: Proposed is `warning`, Accepted is `tip`, and both Superseded by ADR-NNN and Deprecated are `danger`. The `<p>` wrapper is what puts the two badges on their own line – it is why `p` is in the allowed elements list. Copy the block from `docs/decisions/template.md` rather than retyping it.

## Includes

VitePress inlines another file at build time with an include comment. The agent pages are one line each and nothing else:

```text
<!--@include: ../../../.agents/agents/analyst.md-->
```

The path is relative to the including file. This is how the agent definitions live once, under `.agents/agents/`, and still appear as guidebook pages – edit the definition, never the page. On GitHub the include shows as an HTML comment, which is to say as nothing, so a page built this way is a guidebook page only.

## Code blocks

Beyond plain fences, VitePress adds:

- **Line highlighting** – `ts{2,4-6}` after the language highlights those lines.
- **Focus, diff, and colored highlights** – trailing comments `// [!code focus]`, `// [!code ++]`, `// [!code --]`, `// [!code warning]` on a line.
- **Code groups** – tabbed blocks:

````text
::: code-group

```ts [config.ts]
export default {}
```

```json [config.json]
{}
```

:::
````

All of these are guidebook-only and appear as noise inside the fenced block on GitHub, so use them only on pages read in the guidebook. Nothing in the guidebook uses them today. A plain fenced block with a language identifier renders correctly in both places.

## Mermaid diagrams

The site loads `vitepress-plugin-mermaid`, so a ` ```mermaid ` fence renders as a diagram in the guidebook, and GitHub renders the same fence natively – this is one of the few extras that travels. The diagrams are themed to the contingent's graphic profile in `config/vitepress/config.ts`, so a fence needs no styling of its own.

Precede every diagram with a sentence describing it: a diagram carries no alt text, and that sentence is its accessible description. Mermaid is for flows. The architecture diagrams are the committed SVGs under `docs/architecture/diagrams/`, exported from the C4 model and embedded with alt text that reads the diagram out – never redrawn as Mermaid.

## Links between pages

Which form a link takes follows from where the page is read. `docs/AGENTS.md` is the rule, and the guidebook build enforces it by failing on anything that does not resolve.

- A **guidebook page** is read in the site, so it links the site's way: root-absolute to a decision record – `[ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)` – and root-absolute or relative without the `.md` extension to another page, inside or across a chapter – `[the mock back-end](../testing/mock)`, `[the modules](/architecture/modules)`.
- A **decision record** is read on GitHub too, so it links relative with the `.md` extension – `[ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)` – which GitHub resolves and VitePress rewrites to the clean URL. A root-absolute link would break there.
- A **file outside `docs/`** – the README, an `AGENTS.md`, a skill – is read on GitHub only, so it links with an ordinary relative path carrying the extension.
- Anchors follow the heading slug: `[see below](#what-renders-where)`.

## Embedding Vue

A guidebook page can use Vue: interpolation with `{{ }}`, and imported components in a `<script setup>` block. It is rarely wanted – the guidebook is prose and diagrams – and any Vue makes the page unreadable on GitHub. It is also gated: `MD033` allows `Badge`, `p`, and `br` and fails on anything else, so a new component means changing `config/markdownlint/markdownlint.jsonc` first, deliberately, for the whole repository.

## What renders where

| Feature                                                         | GitHub | Guidebook  |
| :-------------------------------------------------------------- | :----- | :--------- |
| Headings, lists, tables, task lists, fenced code, strikethrough | Yes    | Yes        |
| Mermaid diagrams                                                | Yes    | Yes        |
| GitHub alerts (`> [!NOTE]`)                                     | Yes    | Yes        |
| Containers (`::: tip`, `::: info Status`)                       | No     | Yes        |
| Badges (`<Badge />`)                                            | No     | Yes        |
| Includes (`<!--@include: …-->`)                                 | No     | Yes        |
| Code groups, line highlighting, `[!code]`                       | No     | Yes        |
| Vue components, `{{ }}`                                         | No     | Yes        |
| Frontmatter `title`                                             | Hidden | Page title |

The rule for a file read in both places: stay in the shared column, and use a guidebook-only feature only when the page is read mainly in the guidebook – or when it is the ADR status block, which is the one exception the house style makes. When in doubt, a plain heading, list, table, or fenced block renders correctly everywhere.
