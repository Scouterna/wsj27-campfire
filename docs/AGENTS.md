# Documentation

Read the [root `AGENTS.md`](../AGENTS.md) first. This file is what is true only of the prose under `docs/`: the guidebook and the decision records. The architecture model beside them has [its own](architecture/AGENTS.md).

## Two readers

Everything here is read in two places: as plain Markdown when the repository is browsed on GitHub, and rendered by VitePress – published at [scouterna.github.io/wsj27-campfire](https://scouterna.github.io/wsj27-campfire/), and served locally by `pnpm start:guidebook` on [http://localhost:3001](http://localhost:3001). The site is rooted at `docs/`, with `guidebook/**` promoted to the root and `decisions/` served at `/decisions/`, so a chapter and a record are pages of one site with one sidebar.

- A **guidebook page** is read in the site. It may use VitePress syntax – `::: warning` containers, Mermaid fences – and links the site's way: root-absolute to a record (`/decisions/001-record-architecture-decisions`), root-absolute or relative without `.md` to another page, inside or across a chapter (`/context/people/leaders`, `../testing/mock`).
- A **decision record** is read in both. It stays on plain Markdown and links relative with the `.md` extension, so a record opened on GitHub still resolves. It carries two VitePress constructs: the status block, and the warning note described under [The decisions](#the-decisions).

The `writing-markdown` skill has the table of what renders where, and the formatter and linter both run on every file here.

## The guidebook

It describes Campfire as designed, and is rewritten whenever that design changes ([ADR 028](decisions/028-keep-a-software-guidebook.md)). Every chapter is a directory with an `index.md`, and a chapter with parts has one page per part.

- **Write at the level of the design, not the code.** A page says how the system is shaped – its boundaries, its flows, the rules that hold across it, and why. It names a class, a function, or a single rule only where a reader needs the name to find their way, and leaves what the code already states to the code. Commands, scripts, and paths a reader types are worth naming.
- **Never count what can change.** "The modules", not "the four modules"; "the workflows", not "twelve workflows". A count is right until the next change and then wrong without anyone noticing. A number that is the design – the 17-point base, one origin on port 8000 – stays.
- **Most changes leave the guidebook alone.** A page changes when a change makes it wrong – a new boundary or flow, a rule that now holds across the system, a decision worth an ADR. A new class, a new field, or a fix inside the existing design touches no page. When a change seems to need a guidebook edit anyway, check first whether the page names something it should not.
- **Wire a new page into the sidebar** by hand: add its slug to its chapter's list in `config/vitepress/config.ts` – `chapterPages("development", […])`, or `chapterPages("context/people", […])` and its sibling for a person or a system. The link text is read from the page's H1, so the H1 is short, and the list order is the reading order. Records are read from disk and need no wiring; an agent page is listed in the `agents` array in the same file.
- **Describe the design as though it were built.** No `::: warning Not built yet` box, and no "today", "yet", or "not installed" about code the tree has not reached. What is genuinely undecided is still said plainly, as an open choice rather than a missing piece – [Monitoring](guidebook/maintenance/monitoring.md) is that shape – and a gap in the design is never filled with an invented feature.
- **Check every fact** against the design and the decisions before writing it, and against the code wherever the code already holds it. A claim that touches a decision links the record inline – `([ADR 001](/decisions/001-record-architecture-decisions))` – so the reasoning is one click from the description.
- **Diagrams come from the model.** Architecture diagrams are the committed SVGs under `architecture/diagrams/`, embedded with alt text that reads the diagram out. They change only through the model, never by hand. Flows are Mermaid fences, each preceded by a sentence saying what it shows, because the plain view shows the fence as code.
- **Agent pages are includes.** `guidebook/agents/*.md` are one-line `<!--@include:-->` pointers into `.agents/agents/`. Edit the agent definition, not the page.

## The decisions

Most changes are not decisions worth a record. The commit message is where a change explains itself; a record is for the few choices that outlive the change that made them.

A choice earns a record when at least one of these holds:

- **It is expensive to reverse** – a language, a framework, a data store, a protocol, or a contract that shipped apps or another team depend on.
- **It closes off an alternative someone will reasonably propose again**, so the reason it lost has to be findable.
- **It shapes more than one package**, or how the team works – the module rule, the versioning, the process.
- **It changes what an earlier record decided**, and so supersedes it.

It does not earn one when it:

- applies a decision or a convention already written down
- stays inside one package, where the code shows it and a later change can undo it cheaply
- fixes a bug, refactors, or builds a feature inside the existing design
- bumps a dependency or tunes a tool's configuration

When in doubt, ask whether someone a year from now would ask why, and not find the answer in the code or the commit. If they would, write the record. A decision that shapes Campfire is recorded here even when the code it shapes lives elsewhere; what belongs to a back-end service alone is recorded with that service.

A record's life:

- Copy `decisions/template.md` to `NNN-short-title.md`, taking the number after the last row of `decisions/index.md`, and add a row there. Never renumber.
- The status block under the H1 carries a status badge and the date. The statuses are Proposed, Accepted, Superseded by ADR NNN, and Deprecated.
- What an accepted record decided never changes without a new record. A decision that changes gets a new record, and the old one's badge changes to superseded.
- A record may be edited to make it clearer – its wording, its structure, a link, a list brought up to date with what later records added. Where a later record changed something around it, a `::: warning` note under the status block says so.
- Until a record is pushed, it moves with the code and the design it describes, and rewriting it, decision included, is ordinary work.

## Writing a decision record

A record is read by someone deciding whether the choice still holds, years from now, with the code open. It says what was decided and why in one screen – about 300 words – and each section carries only its own part:

- **The title** is the decision in the imperative, `NNN. Route and load data with TanStack Router and Query`, never the topic it is about.
- **Context** is the problem and the forces that decide it, in a paragraph or two. Not the history of how the question came up, and not an explanation of the options a reader can look up.
- **Decision** starts "We", in the present tense, as the team's decision – never "it was decided" – and says what the code or the process now does, in a sentence or a few bullets.
- **Consequences** are what gets easier and what gets harder, a bullet each, with the cost as plain as the gain.
- **Alternatives considered** are one line each – the option, and the reason it lost. List only an option someone seriously weighed or will seriously propose again. Where there was none, leave the section out rather than invent a straw man to lose.

```text
# NNN. Serve status reports from a new service in the project's back-end

::: info Status
<p><Badge type="warning" text="Proposed" /> <Badge type="info" text="2026-09-25" /></p>
:::

## Context

Leaders report their unit's status from camp, and the contingent management team reads the reports beside the list of participants. The project's back-end already knows the units, the roles, and who may read what.

## Decision

We serve status reports from a new service in `wsj27-project-api`, beside the participants and cases services, with the same roles and unit-scoped access.

## Consequences

- A report is readable by exactly the people who may read its unit, with no second set of rules.
- Reporting depends on the project's back-end, and a change to it goes through that repository's maintainers.

## Alternatives considered

- A repository of its own – a second copy of the units and the access rules to keep in step.
- Inside the participants service – a write path in a service that only reads Scoutnet.
```

- One decision per record. A second choice that could be reversed on its own is a second record.
- Say it once. The decision does not restate the context, and the consequences do not restate the decision.
- Link a related record rather than arguing it again, and link it inline where the text leans on it.
- Name a file, a package, or a script only where it is the decision. The code shows the rest.
- Write what stays true as long as the decision does. A version number, a workaround, or a constraint that lifts when a tool matures – TypeScript held on 6 until its linter accepts 7 – belongs in `AGENTS.md` or the guidebook, where it can change without touching the record.
