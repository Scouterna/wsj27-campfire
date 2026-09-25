# Documentation

Read the [root `AGENTS.md`](../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true only of the prose under `docs/`: the guidebook and the decision records. The architecture model beside them has [its own](architecture/AGENTS.md).

## Two readers

Everything here is read in two places: as plain Markdown when the repository is browsed on GitHub, and rendered by VitePress at `pnpm start:guidebook` on [http://localhost:3001](http://localhost:3001). The site is rooted at `docs/`, with `guidebook/**` promoted to the root and `decisions/` served at `/decisions/`, so a chapter and a record are pages of one site with one sidebar.

- A **guidebook page** is read in the site. It may use VitePress syntax – `::: warning` containers, Mermaid fences – and links the site's way: root-absolute to a record (`/decisions/001-record-architecture-decisions`), root-absolute or relative without `.md` to another page, inside or across a chapter (`/context/people/leaders`, `../testing/mock`).
- A **decision record** is read in both. It stays on plain Markdown and links relative with the `.md` extension, so a record opened on GitHub still resolves. It carries two VitePress constructs: the status block, and, under it, a `::: warning` note where the code has not reached the decision or something around it has moved since.

The `writing-markdown` skill has the table of what renders where, and the formatter and linter both run on every file here.

## The guidebook

It describes Campfire as its first version is built, and is rewritten whenever that design changes ([ADR 028](decisions/028-keep-a-software-guidebook.md)). A change to how something works is not done until the page that describes it says so. The repository is still a skeleton, and the guidebook does not say so: every page describes version 1 as built, in the present tense, and the code is where a reader learns how far the tree has come. Every chapter is a directory with an `index.md`, and a chapter with parts has one page per part.

- A page is wired into the sidebar by hand: add its slug to its chapter's list in `config/vitepress/config.ts` – `chapterPages("development", […])`, or `chapterPages("context/people", […])` and its sibling for a person or a system. The link text is read from the page's H1, so the H1 is short, and the list order is the reading order. Records are read from disk and need no wiring; an agent page is listed in the `agents` array in the same file.
- Describe version 1 as built. No `::: warning Not built yet` box, and no "today", "yet", or "not installed" about code the tree has not reached. What is genuinely undecided is still said plainly, as an open choice rather than a missing piece – [Monitoring](guidebook/maintenance/monitoring.md) is that shape – and a gap in the design is never filled with an invented feature.
- Every fact is checked against the design and the decisions before it is written, and against the code wherever the code already holds it, and a claim that touches a decision links the record inline – `([ADR 001](/decisions/001-record-architecture-decisions))` – so the reasoning is one click from the description.
- Architecture diagrams are the committed SVGs under `architecture/diagrams/`, embedded with alt text that reads the diagram out. They change only through the model, never by hand. Flows are Mermaid fences, each preceded by a sentence saying what it shows, because the plain view shows the fence as code.
- `guidebook/agents/*.md` are one-line `<!--@include:-->` pointers into `.agents/agents/`. Edit the agent definition, not the page.

## The decisions

A record captures a significant decision – a language, a framework, an approach that closes off alternatives – with its context, the choice, its consequences, and the alternatives that lost and why. Skip one for a reversible choice the code makes obvious. [ADR 001](decisions/001-record-architecture-decisions.md) through [ADR 035](decisions/035-promote-the-web-by-moving-environment-tags.md) exist so far, so the next record is 036.

- Copy `decisions/template.md` to `NNN-short-title.md`, taking the next number, and add a row to `decisions/index.md`. Never renumber.
- The H1 is `NNN. Title in the imperative`; the status block under it carries a status badge and the date. The statuses are Proposed, Accepted, Superseded by ADR NNN, and Deprecated.
- Until a record is pushed, it can be rewritten. While the work is still on this machine, a record moves with the code and the design it describes, and changing it is ordinary work rather than a violation.
- Once pushed, an accepted record is never rewritten. A decision that changes gets a new record, and the old one's status badge changes to superseded. That badge and a `::: warning` note under it – the code has not reached this yet, a later record moved a path it names – are the only edits a pushed record takes; the argument itself stays as written.
- Write it as the team's decision, in the present tense: "we adopt X because", the rejected option named with the reason it lost, the cost stated in the consequences. Never "it was decided".
- A decision that shapes Campfire is recorded here even when the code it shapes lives elsewhere – the back-end services have their own repositories – and what belongs to a service alone is recorded with it.
