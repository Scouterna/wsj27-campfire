---
name: writing-markdown
description: Writes, formats, and fixes Markdown in the WSJ27 Campfire repository so it renders both on GitHub and in the VitePress guidebook under docs/ and survives Prettier and markdownlint unchanged. Covers the house conventions, the quirks the formatter and linter impose (blank line before every list, verbatim examples in text fences, sequential ordered-list numbers, emphasis-marker rewriting, inline HTML held to three elements), the link form each reader needs, and the pnpm format and check:markdown toolchain. Use when creating or editing any .md file – README, an ADR, a guidebook page, a skill, or a spec – or when a document renders wrong or fails the markdown check.
metadata:
  version: "1.0"
---

# Writing Markdown

Writes Markdown that renders correctly wherever this repository reads it and survives the formatter unchanged. Two targets matter here: the repository's own Markdown files – the README, the `AGENTS.md` files, and the skills, authored in **GitHub Flavored Markdown (GFM)** and read as plain Markdown when the repository is browsed on **GitHub** – and the **VitePress guidebook** under `docs/`, which adds syntax of its own. The decision records under `docs/decisions/` are read in both. The `.agents/specs` scratch is gitignored and reaches neither reader, so it is held to the house conventions and to nothing else. Prettier and markdownlint are the tools, wired into `pnpm format` and `pnpm check:markdown`, and running them is part of writing a document rather than a chore afterwards.

Agents already know Markdown syntax. This skill is the small set of things that are specific to this repository: the house conventions, the quirks Prettier and markdownlint impose, and how the two tools are run. The house rules in [`AGENTS.md`](../../../AGENTS.md) are canonical, and [`docs/AGENTS.md`](../../../docs/AGENTS.md) is canonical for the prose under `docs/` – the Markdown, Language, and two-readers sections there win over anything here. This skill explains how to satisfy them and why each one exists.

## When to Use

Apply this skill when:

- Writing or editing any `.md` file – the README, an `AGENTS.md`, an ADR under `docs/decisions/`, a guidebook page under `docs/guidebook/`, a skill under `.agents/skills/`, or a spec under `.agents/specs/`
- Running `pnpm format` or `pnpm check:markdown`, or reasoning about the project's Prettier and markdownlint config
- A document renders wrong when browsed on GitHub or in the VitePress guidebook, or fails the markdown check

## Prerequisites

`pnpm install` is the only setup step – it installs Prettier and markdownlint-cli2 as dev dependencies and points git at the repository hooks. The configs are committed:

- **Prettier** – `config/prettier/prettier.config.ts`, with `config/prettier/prettier.ignore`
- **markdownlint** – `config/markdownlint/markdownlint-cli2.jsonc`, which extends `config/markdownlint/markdownlint.jsonc`

See [tooling-guide.md](references/tooling-guide.md) for what those configs contain and why.

## Key Context

The conventions and quirks that are specific to this repository:

- **Blank line before every list** – without it the list renders as a paragraph. The same blank line surrounds every heading, code block, and table.
- **ATX headings only** (`#`), one H1 per document, no skipped levels
- **Fenced code blocks only**, always with a language identifier – never indented code
- **`text` for any example that must not be reformatted** – Prettier formats the contents of every fence whose language it knows (`typescript`, `json`, `yaml`, `html`, `css`, `vue`, `markdown`, and – through `@prettier/plugin-xml` – `xml`), and will silently break a deliberately-wrong or whitespace-critical example
- **Ordered lists numbered `1.` `2.` `3.`** – Prettier renumbers nothing, so a list of repeated `1.` survives formatting and then fails markdownlint (`MD029`)
- **`-` for bullets** – Prettier rewrites `*` and `+` to `-`. Two lists separated only by a blank line are a trap: Prettier alternates their markers, and the `*` one then fails `MD004`. Merge back-to-back lists into one, or put a sentence between them.
- **Emphasis markers** – Prettier rewrites `*italic*` to `_italic_` and `__bold__` to `**bold**`, so write those directly
- **One line per paragraph** – never hard-wrap prose; `proseWrap: preserve` means the line breaks written are the line breaks kept, and `MD013` is off so line length is an authoring choice
- **Backslash (`\`) for hard line breaks**, never trailing spaces
- **No bold-as-heading** – `MD036` is on; a bold line standing in for a heading fails, use a real `###` heading
- **Inline HTML is held to three elements** – `MD033` allows `Badge`, `p`, and `br` and refuses everything else. The first two build the ADR status block and the third breaks a line inside a table cell, so reaching for any other element or Vue component means changing the shared config first.
- **Descriptive link text**, never "click here". The link form follows the reader: a file outside `docs/` links with an ordinary relative path carrying the extension, a guidebook page links the site's way without `.md`, and a record links relative with `.md` so it still resolves on GitHub – the split is in [vitepress-guide.md](references/vitepress-guide.md).
- **Alt text on every image** – describe content and purpose, never "image of"
- **Language rules from `AGENTS.md`** – American English; en-dash (–) for breaks and ranges, never em-dash (—) or a hyphen; the Oxford comma; "front-end" and "back-end" hyphenated; no corporate language
- **Format, then check** – `pnpm format` writes fixes, `pnpm check:markdown` reports what is left. Never run `prettier` or `markdownlint-cli2` by hand; the pnpm scripts pass the project config explicitly.

## Instructions

### Step 1: Decide where the document renders

GitHub, the VitePress guidebook, or both. The portable GFM baseline – headings, lists, tables, task lists, fenced code, and strikethrough – renders wherever the file is read. The guidebook adds syntax the plain GitHub view does not: containers (`::: tip`), includes, code groups, line highlighting, and Vue. Keep those on guidebook pages. A file read in both places stays on the portable baseline, with one standing exception: a decision record opens with a `::: info Status` container and carries a `::: warning` container when a later record changed something around it, so both stay. Mermaid fences and GitHub alert blockquotes (`> [!NOTE]`) render on both targets. [vitepress-guide.md](references/vitepress-guide.md) has the full split in its "what renders where" table.

**Outcome:** the feature set the document may use is settled before the first heading is written.

### Step 2: Write the document

Follow Key Context. Build the headings as a real outline – one H1, levels incrementing by one – because that outline is what a screen reader, a table of contents, and the guidebook sidebar all navigate. Give any document over roughly 100 lines a TOC after its intro. Reach for HTML only where Markdown cannot express the result, and remember that `MD033` allows three elements and nothing else.

**Outcome:** a document that renders on the Step 1 target with no surprises.

### Step 3: Format, then check

Run these two, in this order:

```bash
pnpm format
pnpm check:markdown
```

`pnpm format` runs Prettier with `--write` across the repository; `pnpm check:markdown` runs markdownlint-cli2 with the project config. Do not run `prettier` or `markdownlint-cli2` directly – the scripts pass the committed config, and a hand-run tool formats against whatever it happens to discover. When somebody else is working in the same tree, [tooling-guide.md](references/tooling-guide.md) has the scoped form of the format command that touches only your own files.

Formatting does not make the check redundant. Prettier leaves `1. 1. 1.` numbering, skipped heading levels, a second H1, a bold-as-heading line, a stray `<div>`, and a missing alt text exactly as written, and markdownlint fails every one. The two tools cover different defects, so both steps run every time. See [tooling-guide.md](references/tooling-guide.md) for exactly what each tool changes and what it leaves.

**Outcome:** the formatter reports no changes on a second run, and `pnpm check:markdown` reports zero issues.

### Step 4: Fix findings at the source

Change the document, not the config. Disabling a rule, or silencing one finding with an inline `<!-- markdownlint-disable -->`, hides the same defect in every document that follows. The config in `config/markdownlint/` is a shared decision – if a rule is genuinely wrong for the whole repository, change it there once, deliberately, not per file. Re-run both scripts after each fix.

**Outcome:** a clean `pnpm check:markdown` with the config untouched.

## Quality Checks

- [ ] One H1, and heading levels increment by one throughout
- [ ] A blank line precedes every list, and surrounds every heading, code block, and table
- [ ] Every fenced code block carries a language identifier; no indented code blocks anywhere
- [ ] Examples that must survive verbatim use a `text` fence, not their real language
- [ ] No bold line stands in for a heading (`MD036`); real `###` headings throughout
- [ ] Inline HTML is `Badge`, `p`, or `br`, and nothing else
- [ ] Link text describes its destination, and every link takes the form its reader needs
- [ ] Every image has alt text describing content and purpose
- [ ] Guidebook-only syntax stays on guidebook pages; files read outside the guidebook keep to portable GFM
- [ ] Language follows `AGENTS.md` – American English, en-dash never em-dash, Oxford comma
- [ ] `pnpm format` ran, then `pnpm check:markdown`, and the second format run changed nothing

## Reference Files

- [tooling-guide.md](references/tooling-guide.md) – The project's Prettier and markdownlint config, the `pnpm` scripts, the embedded-code trap, exactly what each tool does and does not fix, and the git hooks and workflows that run them. Read it when the formatter or the markdown check does something unexpected.
- [vitepress-guide.md](references/vitepress-guide.md) – The VitePress guidebook under `docs/`: the chapter tree and how a page joins it, frontmatter, containers, badges, includes, code groups, Mermaid, the link form each reader needs, and the full "what renders where" split. Read it when the document is a guidebook page or a decision record.

## Important Notes

- Two render targets, one house style. When a feature might not travel, check the "what renders where" table in `vitepress-guide.md` before using it.
- `pnpm check:markdown` lints `**/*.md` across the repository, the skills included. Five things are ignored: `.agents/specs`, which is gitignored working scratch; `temp`, the gitignored folder for reference material under study; the symlinked directories `.claude/agents`, `.claude/skills`, and `.github/agents`, which point into `.agents/`; every `CLAUDE.md`, which is a symlink to the `AGENTS.md` beside it; and `node_modules` and `.build`. The real files are linted once at their real paths.
- A skill has one more gate. `.github/workflows/check_skills.yml` reads every `SKILL.md` on a pull request and fails when the frontmatter `name` does not match the directory, when `metadata.version` is missing or is not a quoted `major.minor` string, when the `description` is missing, when a relative link in `SKILL.md` does not resolve, or when a released skill changed without its version being bumped. Link checking stops at `SKILL.md`, so links inside `references/` are on you.
- A dead link fails the guidebook build outright: `pnpm build:guidebook` refuses a link it cannot resolve, and `.github/workflows/build_guidebook.yml` runs that build on every pull request that touches the guidebook.
- No commit hook and no editor runs the markdown check. The `pre-push` hook does, and so does `.github/workflows/check.yml`, so a finding fails a push and a pull request but never a commit – run `pnpm check:markdown` yourself before handing work back.
