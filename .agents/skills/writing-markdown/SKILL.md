---
name: writing-markdown
description: Writes, formats, and fixes Markdown in the WSJ27 Campfire repository so it renders on GitHub and in the VitePress guidebook under docs/ and survives Prettier and markdownlint unchanged. Covers the quirks the formatter and linter impose (blank line before every list, verbatim examples in text fences, sequential ordered-list numbers, emphasis-marker rewriting, inline HTML held to three elements), the link form each reader needs, and the pnpm format and check:markdown toolchain. Use when creating or editing any .md file – README, an ADR, a guidebook page, a skill, or a spec – or when a document renders wrong or fails the markdown check.
metadata:
  version: "2.0"
---

# Writing Markdown

The Markdown rules specific to this repository, and how to satisfy the two tools that enforce them. Files outside `docs/` are read on GitHub, guidebook pages in the VitePress site, and decision records in both. The language rules are in [`AGENTS.md`](../../../AGENTS.md), and the rules for prose under `docs/` in [`docs/AGENTS.md`](../../../docs/AGENTS.md) – both win over this skill.

## When to Use

- Writing or editing any `.md` file – the README, an `AGENTS.md`, an ADR, a guidebook page, a skill, or a spec
- Running `pnpm format` or `pnpm check:markdown`, or changing their config
- A document renders wrong on GitHub or in the guidebook, or fails the markdown check

## Key Context

- **A blank line before every list**, and around every heading, code block, and table – without it a list renders as a paragraph.
- **ATX headings**, one H1, no skipped levels, and no bold line standing in for a heading (`MD036`).
- **Fenced code with a language identifier.** Prettier reformats the inside of every fence in a language it knows, so an example that must stay byte-for-byte – deliberately wrong, or whitespace-sensitive – goes in a `text` fence.
- **`1.` `2.` `3.` for ordered lists.** Prettier renumbers nothing, so repeated `1.` fails `MD029`.
- **`-` for bullets.** Prettier alternates the markers of two lists separated only by a blank line, and the `*` one fails `MD004` – merge them or put a sentence between.
- **`_italic_` and `**bold**`**, which is what Prettier rewrites the other forms to.
- **One line per paragraph**, never hard-wrapped, and a backslash for a hard line break.
- **Inline HTML is `Badge`, `p`, and `br` only** (`MD033`). They build the ADR status block and break a line in a table cell.
- **The link form follows the reader.** A file outside `docs/` links relative with the extension, a guidebook page links the site's way without `.md`, and a decision record links relative with `.md` so it resolves on GitHub too.
- **Descriptive link text**, and alt text on every image describing what it shows.

## Instructions

1. **Decide where it renders.** GitHub, the guidebook, or both. Containers, badges, includes, code groups, and Vue render only in the guidebook, so a file read on GitHub stays off them – except the `::: info Status` block every ADR opens with.
2. **Write it** to the Key Context. A document over about 100 lines gets a table of contents after its intro.
3. **Run `pnpm format`, then `pnpm check:markdown`.** Do not run `prettier` or `markdownlint-cli2` directly – the scripts pass the committed config, and a hand-run tool formats against whatever it finds. Both run every time, because Prettier leaves structural defects exactly as written.
4. **Fix findings in the document.** Never disable a rule inline or relax the config for one file; a rule wrong for the whole repository is changed once, in `config/markdownlint/`.

## Quality Checks

- [ ] One H1, heading levels incrementing by one
- [ ] Every fence carries a language, and verbatim examples use `text`
- [ ] Guidebook-only syntax appears only on guidebook pages, apart from the ADR status block
- [ ] Every link takes its reader's form
- [ ] `pnpm format` changed nothing on a second run, and `pnpm check:markdown` reported nothing

## Reference Files

- [tooling-guide.md](references/tooling-guide.md) – What Prettier and markdownlint each change, check, and leave alone, the embedded-code trap, and where the checks run. Read it when a tool does something unexpected.
- [vitepress-guide.md](references/vitepress-guide.md) – How a guidebook page joins the site, and the containers, badges, includes, code blocks, Mermaid, links, and Vue the guidebook adds, with what renders where. Read it for a guidebook page or a decision record.

## Important Notes

- `pnpm check:markdown` lints every `.md` in the repository except the gitignored `.agents/specs` and `temp`, the symlinks into `.agents/`, every `CLAUDE.md`, `node_modules`, and `.build`. The spec folder is still held to these conventions by hand.
- A skill also passes `check_skills.yml`: the frontmatter `name` matches the directory, `metadata.version` is a quoted `major.minor` string bumped on every change, and every relative link in `SKILL.md` resolves. Links in `references/` are not checked.
- A dead link fails `pnpm build:guidebook`, the only link check in the toolchain.
- The markdown check runs in the `pre-push` hook and in continuous integration, never on commit – run it yourself before handing work back.
