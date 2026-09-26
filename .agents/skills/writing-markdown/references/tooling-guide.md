# Markdown tooling guide

Prettier normalizes shape and markdownlint enforces structure, and neither replaces the other. Both are dev dependencies, driven through `pnpm` scripts that pass the committed config.

## Contents

- [The scripts](#the-scripts)
- [Prettier](#prettier)
- [The embedded-code trap](#the-embedded-code-trap)
- [Markdownlint](#markdownlint)
- [What formatting leaves for the linter](#what-formatting-leaves-for-the-linter)
- [Where the checks run](#where-the-checks-run)

## The scripts

- `pnpm format` runs Prettier with `--write` over the whole repository. `pnpm check:format` is the read-only form.
- `pnpm check:markdown` runs markdownlint-cli2 and fixes nothing.

A hand-run tool finds whatever config sits above the file, which outside the repository is its own defaults – semicolons in embedded TypeScript and prose wrapped at 80 columns.

Where someone else is working in the same tree, format only your own files, because `--write .` rewrites theirs too:

```bash
pnpm exec prettier --config config/prettier/prettier.config.ts --ignore-path config/prettier/prettier.ignore --write <files>
```

`pnpm check:markdown` has no scoped form. Read its findings for your own files and leave the rest.

## Prettier

The config is `config/prettier/prettier.config.ts`. Two settings matter for Markdown: `proseWrap: "preserve"` keeps authored line breaks, so prose is one line per paragraph and `MD013` is off; `printWidth: 100` applies to tables and embedded code. Of the plugins, only `@prettier/plugin-xml` reaches into Markdown, through an `xml` fence.

In Markdown, Prettier:

- Rewrites `*italic*` to `_italic_`, `__bold__` to `**bold**`, and `*` or `+` bullets to `-`
- Indents unordered lists by 2 and ordered lists by 3
- Aligns and pads tables
- Adds missing blank lines around headings, lists, and code blocks, and removes extra ones
- Formats the inside of every fence in a language it knows

It keeps two lists separated only by a blank line apart by alternating their markers, `-` then `*`, and markdownlint fails the `*` one under `MD004`.

## The embedded-code trap

| Fence                                                                      | Contents formatted |
| :------------------------------------------------------------------------- | :----------------- |
| `typescript`, `javascript`, `jsx`, `tsx`, `json`, `json5`, `jsonc`, `yaml` | Yes                |
| `html`, `vue`, `css`, `scss`, `less`, `graphql`, `xml`, `markdown`         | Yes                |
| `text`, `console`, `sh`, `bash`, `swift`, `kotlin`, `gradle`, `mermaid`    | No                 |

An `html` or `vue` example of markup wrapping Markdown loses its blank lines and becomes the broken pattern it warned about. A `markdown` example of nesting gets dedented. An `xml` example is reindented by the XML plugin, which keeps element text but moves the indentation around it. Fence anything that must stay byte-for-byte as `text`.

## Markdownlint

`config/markdownlint/markdownlint-cli2.jsonc` sets which files are linted and extends `config/markdownlint/markdownlint.jsonc`, which keeps every rule on by default and overrides these:

- `MD003` – ATX headings
- `MD004` – `-` bullets
- `MD007` – nested lists indented by 2
- `MD013` – off, because `proseWrap` preserves authored lines
- `MD024` – a duplicate heading is allowed in a different section
- `MD025` – a frontmatter `title` is not an H1, because VitePress puts it in the page `<title>`
- `MD029` – ordered lists numbered in sequence
- `MD033` – inline HTML only as `Badge`, `p`, and `br`

The defaults that carry the house conventions are `MD001` (no skipped levels), `MD009` (no trailing spaces), `MD022` (blank lines around headings), `MD036` (no emphasis as a heading), `MD040` (a language on every fence), `MD045` (alt text), and `MD060` (one table style – a finding means the table was edited after the last format run).

## What formatting leaves for the linter

| Written                            | Prettier                  | markdownlint |
| :--------------------------------- | :------------------------ | :----------- |
| `1.` `1.` `1.` for an ordered list | Unchanged                 | `MD029`      |
| H1 followed by H3                  | Unchanged                 | `MD001`      |
| Two H1s                            | Unchanged                 | `MD025`      |
| A bold line as a heading           | Unchanged                 | `MD036`      |
| A fence with no language           | Unchanged                 | `MD040`      |
| `![](chart.png)`                   | Unchanged                 | `MD045`      |
| A `<div>` around a section         | Unchanged                 | `MD033`      |
| Two lists back to back             | Markers alternated to `*` | `MD004`      |

Neither tool checks that a link resolves.

## Where the checks run

- **`pre-push`** runs the four shared checks, the markdown check among them, and stops at the first failure.
- **`check.yml`** runs the same four as separate steps on a pull request, so one run reports every failure.
- **`build_guidebook.yml`** builds the guidebook when a pull request touches it, and fails on a dead internal link.
- **`check_skills.yml`** validates every `SKILL.md` – its frontmatter, its relative links, and the version bump.

Nothing runs the markdown check on commit or on save.
