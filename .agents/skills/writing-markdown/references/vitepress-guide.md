# VitePress guidebook guide

The guidebook under `docs/` is a [VitePress](https://vitepress.dev) site. Its pages are Markdown with syntax of its own, and a decision record is also read as plain Markdown on GitHub. `docs/AGENTS.md` holds the rules for the prose; this guide covers the syntax and how a page joins the site.

## Contents

- [The site](#the-site)
- [How a page joins](#how-a-page-joins)
- [Containers and badges](#containers-and-badges)
- [Includes](#includes)
- [Code blocks and Mermaid](#code-blocks-and-mermaid)
- [Links](#links)
- [Vue](#vue)
- [What renders where](#what-renders-where)

## The site

- The config is `config/vitepress/config.ts`, re-exported from `docs/.vitepress/config.ts` because VitePress requires that path.
- `pnpm start:guidebook` serves it on port 3001; `pnpm build:guidebook` builds it into `.build/docs`.
- `cleanUrls` drops `.md` from URLs. A rewrite serves `docs/guidebook/**` from the site root and `docs/decisions/` from `/decisions/`. The site is published under the `/wsj27-campfire/` base.
- `srcExclude` keeps the ADR template, `architecture/**`, and every `AGENTS.md` and `CLAUDE.md` out of the build.
- The build fails on a dead internal link.

## How a page joins

Every chapter is a directory with an `index.md`, and a chapter with parts has a page per part. A new guidebook page joins the sidebar by adding its slug to its chapter's `chapterPages(…)` list in `config/vitepress/config.ts`. The list order is the reading order, and those lists are where the chapters' pages are read from.

An ADR joins by existing – the config reads `docs/decisions/` in filename order, so `NNN-slug.md` needs nothing else. An agent page is listed in the `agents` array. Neither is in the sidebar, so `transformPageData` builds their previous and next links.

The H1 is the sidebar label and the link text in those chains, so keep it short, and keep the `NNN.` prefix on an ADR's H1. A frontmatter `title` goes into the page `<title>`, not the H1.

## Containers and badges

Containers are guidebook-only; on GitHub they show as literal `:::` lines:

```text
::: tip
A helpful aside.
:::
```

The types are `tip`, `warning`, `danger`, `info`, and `details`, each with an optional title after the type. GitHub alert blockquotes (`> [!NOTE]`) render in both places, so prefer them where a page is also read on GitHub.

Every decision record opens with a status block – the one guidebook-only construct a record keeps:

```text
::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-08-15" /></p>
:::
```

Proposed is `warning`, Accepted `tip`, and Superseded and Deprecated `danger`. Copy the block from `docs/decisions/template.md`. A record whose surroundings a later record changed carries a titled `::: warning` saying what moved and that the decision stands – that note and the status badge are the only amendments an accepted record gets.

## Includes

```text
<!--@include: ../../../.agents/agents/analyst.md-->
```

An include inlines another file at build time, with a path relative to the including file. It is how each agent page shows its definition from `.agents/agents/`, so edit the definition, never the page. On GitHub an include is an invisible comment.

## Code blocks and Mermaid

VitePress adds line highlighting (`ts{2,4-6}`), `// [!code ++]`-style markers, and `::: code-group` tabs. All are guidebook-only and show as noise on GitHub.

A `mermaid` fence renders as a diagram in both places, themed by the config. Precede each diagram with a sentence describing it – that sentence is its accessible description. Mermaid is for flows; the architecture diagrams are the SVGs exported from the C4 model under `docs/architecture/diagrams/`, never redrawn.

## Links

- **A guidebook page** links root-absolute to a record – `/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells` – and root-absolute or relative without `.md` to another page – `../testing/mock`.
- **A decision record** links relative with `.md` – `012-run-campfire-in-three-environments-on-one-origin.md` – which GitHub resolves and VitePress rewrites.
- **A file outside `docs/`** links relative with the extension.
- An anchor follows the heading slug – `#what-renders-where`.

## Vue

A page can use `{{ }}` interpolation and components in `<script setup>`, which makes it unreadable on GitHub. `MD033` refuses any element but `Badge`, `p`, and `br`, so a new component means changing `config/markdownlint/markdownlint.jsonc` first, for the whole repository.

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
