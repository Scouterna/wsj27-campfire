# Markdown tooling guide

Formatting and linting Markdown in this repository with Prettier and markdownlint. The two tools cover different defects and neither replaces the other, so both run on every change – Prettier normalizes shape, markdownlint enforces structure. Both are dev dependencies installed by `pnpm install`, and both are driven through `pnpm` scripts that pass the committed config.

## Contents

- [The two scripts](#the-two-scripts)
- [Prettier](#prettier)
- [The embedded-code trap](#the-embedded-code-trap)
- [Markdownlint](#markdownlint)
- [What formatting doesn't fix](#what-formatting-doesnt-fix)
- [Where the checks run](#where-the-checks-run)

## The two scripts

Run these, never the underlying tools:

```bash
pnpm format
pnpm check:markdown
```

- `pnpm format` – `prettier --config config/prettier/prettier.config.ts --ignore-path config/prettier/prettier.ignore --write .` – rewrites every file in the repository to house shape. `pnpm check:format` is the same with `--check`, the read-only form the `pre-push` hook and the check workflow run.
- `pnpm check:markdown` – `markdownlint-cli2 --config config/markdownlint/markdownlint-cli2.jsonc` – reports structural findings and fixes nothing.

Both point at the committed config explicitly. Running `prettier` or `markdownlint-cli2` by hand lets each tool discover whatever config sits above the file, which for a file outside the repository is the tool's own defaults – Prettier then adds semicolons to embedded TypeScript and wraps at 80 columns. Always go through the pnpm scripts.

To format only the files you touched during a change – which is what to do when somebody else is working in the same tree, because `--write .` would rewrite their files too:

```bash
pnpm exec prettier --config config/prettier/prettier.config.ts --ignore-path config/prettier/prettier.ignore --write <files>
```

The plain `pnpm format` is still the canonical run before handing work back. `pnpm check:markdown` has no scoped form – it lints the whole repository either way, so read its findings for your own files and leave the rest alone.

## Prettier

Prettier normalizes indentation, blank lines, emphasis markers, list formatting, and table alignment. The config is `config/prettier/prettier.config.ts`, below without its comments and without its one `overrides` entry, which drops the organize-imports plugin for `*.vue` files and touches no Markdown:

```ts
const config: Config = {
  printWidth: 100,
  proseWrap: "preserve", // keep authored line breaks in Markdown prose
  semi: false,
  xmlWhitespaceSensitivity: "preserve",
  plugins: [
    "@prettier/plugin-xml",
    "prettier-plugin-curly",
    "prettier-plugin-organize-imports",
    "prettier-plugin-packagejson",
  ],
}
```

The plugins act on code, not Markdown prose – though `@prettier/plugin-xml` reaches inside an `xml` fence, which the next section covers. What matters for Markdown itself is `printWidth` and `proseWrap`.

`proseWrap: preserve` keeps existing line breaks instead of rewrapping paragraphs, which is why `printWidth` affects tables and embedded code but not prose, and why `MD013` is switched off in the markdownlint config: line length becomes an authoring choice, and the choice is one line per paragraph, never hard-wrapped. The other two modes both break something – `never` strips the padding from any table too wide for `printWidth`, and `always` hard-wraps prose into unintended line breaks in some previewers.

What Prettier changes in Markdown:

- Emphasis markers: `*italic*` becomes `_italic_`, `__bold__` becomes `**bold**`
- Bullet markers: `*` and `+` become `-`
- List indentation: 2 spaces for unordered, 3 for ordered
- Table column alignment and padding
- Blank lines: excess removed, missing ones added around headings, lists, and code blocks
- Fenced code block style, and a trailing newline at end of file
- The contents of every fenced code block whose language it supports

One exception produces a lint failure out of nowhere. Two lists separated only by a blank line are still two lists, and Prettier keeps them distinct by alternating their markers – `-` for the first, `*` for the second. Markdownlint then fails the `*` one under `MD004`. The fix is at the source: back-to-back lists almost always want to be a single list, or a sentence between them.

## The embedded-code trap

Prettier formats the code inside a fenced block using that language's formatter. A `typescript` block gets Prettier's TypeScript rules, a `json` block gets its JSON rules, an `xml` block gets the XML plugin's rules – including whitespace changes that break an example whose whitespace is the point.

| Fence                                                                   | Contents formatted | Safe for verbatim examples |
| :---------------------------------------------------------------------- | :----------------- | :------------------------- |
| `typescript`, `javascript`, `jsx`, `tsx`                                | Yes                | No                         |
| `json`, `json5`, `jsonc`, `yaml`                                        | Yes                | No                         |
| `html`, `vue`, `css`, `scss`, `less`, `graphql`                         | Yes                | No                         |
| `xml`                                                                   | Yes                | No                         |
| `markdown`                                                              | Yes                | No                         |
| `text`, `console`, `sh`, `bash`, `swift`, `kotlin`, `gradle`, `mermaid` | No                 | Yes                        |

`xml` is the one this repository added: `@prettier/plugin-xml` is in the config for the Android manifests and string resources, so it reaches an `xml` fence in a Markdown file too and reindents the markup. `xmlWhitespaceSensitivity: "preserve"` keeps element text verbatim – the indentation around it still moves.

Two failures this causes, both seen in real files:

- An `html` or `vue` block showing markup that wraps Markdown gets its blank lines collapsed, turning a correct example into the broken pattern it was warning about.
- A `markdown` block showing indentation-sensitive nesting gets its items dedented, so the example no longer demonstrates anything.

The rule: if an example must reach the reader byte-for-byte – because it is deliberately wrong, or because its whitespace carries the meaning – fence it as `text`. Use the real language only where reformatting the sample to house style is harmless or wanted.

## Markdownlint

Markdownlint catches structural issues Prettier doesn't touch – heading hierarchy, missing alt text, missing language identifiers, list marker style, stray HTML. The runner config `config/markdownlint/markdownlint-cli2.jsonc` sets which files are linted and extends the rule config:

```jsonc
{
  "config": { "extends": "./markdownlint.jsonc" },

  "globs": ["**/*.md"],

  "ignores": [
    // Agent scratch – gitignored working files.
    ".agents/specs",
    // Gitignored reference material under study.
    "temp",
    "**/node_modules",
    "**/.build",
    // Symlinks – the real files are linted once at their real paths.
    ".claude/agents",
    ".claude/skills",
    ".github/agents",
    "**/CLAUDE.md",
  ],
}
```

Everything ignored beyond `node_modules` and `.build` is either scratch or a symlink. `.agents/specs` is the gitignored per-branch working scratch, read by the people on the branch and never published, and `temp` is the gitignored folder for reference material under study. `.claude/agents`, `.claude/skills`, and `.github/agents` point into `.agents/`, and every `CLAUDE.md` points at the `AGENTS.md` beside it, so the real files are linted once at their real paths. markdownlint follows a symlink, which is why each needs saying; Prettier refuses a symlink outright and its ignore file says nothing about them.

The rule config is `config/markdownlint/markdownlint.jsonc` – `.jsonc` so each override can carry the reason it exists, which is worth reading in full at the source. Stripped of its comments:

```json
{
  "default": true,
  "MD003": { "style": "atx" },
  "MD004": { "style": "dash" },
  "MD007": { "indent": 2 },
  "MD013": false,
  "MD024": { "siblings_only": true },
  "MD025": { "front_matter_title": "" },
  "MD029": { "style": "ordered" },
  "MD033": { "allowed_elements": ["Badge", "p", "br"] }
}
```

`default: true` keeps every rule this file does not name switched on, so a rule added in a future markdownlint release arrives enabled rather than silently absent.

What each override does:

- `MD003 atx` – require ATX headings (`#`), not setext (underline style)
- `MD004 dash` – require `-` for unordered lists, not `*` or `+`
- `MD007 indent 2` – 2-space indentation for nested unordered lists
- `MD013 false` – disable the line-length limit; `proseWrap: preserve` means line length is an authoring choice
- `MD024 siblings_only` – allow duplicate heading text in different sections
- `MD025 front_matter_title ""` – do not treat a frontmatter `title` as the document's H1; VitePress renders frontmatter `title` into the page `<title>`, not as the H1, so a page may legitimately have both
- `MD029 ordered` – require sequential numbers (`1. 2. 3.`), not repeated `1.`
- `MD033 allowed_elements` – inline HTML is off except for `Badge`, `p`, and `br`: the first two build the ADR status block and the third breaks a line inside a table cell. Anything else fails, so reaching for a Vue component on a guidebook page means adding it here first

Default rules that carry this skill's conventions, left on:

- `MD001` – heading levels increment by one, no skipping
- `MD009` – no trailing spaces
- `MD022` – blank lines around headings
- `MD036` – no emphasis used in place of a heading; use a real heading
- `MD040` – fenced code blocks carry a language identifier
- `MD045` – images have alt text
- `MD060` – a table holds to one column style. The default accepts aligned, compact, or tight and fails a table that mixes them; Prettier writes the aligned form, so a finding here means the table was hand-edited after the last format run

Fix findings in the document, not by relaxing the config or adding an inline `<!-- markdownlint-disable -->`. The config is a shared, committed decision; changing it changes the rule for every document.

## What formatting doesn't fix

Running the formatter first doesn't make the check optional. These pass Prettier untouched and then fail markdownlint:

| Written                            | Prettier                  | markdownlint                          |
| :--------------------------------- | :------------------------ | :------------------------------------ |
| `1.` `1.` `1.` for an ordered list | Unchanged                 | `MD029` – expected 2, 3               |
| H1 followed by H3                  | Unchanged                 | `MD001` – skipped level               |
| Two H1s in one document            | Unchanged                 | `MD025` – multiple top-level headings |
| A bold line used as a heading      | Unchanged                 | `MD036` – emphasis as heading         |
| A fenced block with no language    | Unchanged                 | `MD040` – no language specified       |
| `![](chart.png)`                   | Unchanged                 | `MD045` – no alt text                 |
| A `<div>` wrapping a section       | Unchanged                 | `MD033` – inline HTML                 |
| Two lists back-to-back             | Markers alternated to `*` | `MD004` – expected dash               |

Prettier renumbers nothing and reorders nothing – it is a shape normalizer, and markdownlint is the structural check. Neither verifies that a link resolves or that a document says anything useful.

## Where the checks run

`pnpm install` runs `pnpm prepare`, which points git at `.githooks`. Two hooks matter for Markdown:

- `commit-msg` – holds the commit subject to the Conventional Commits rules. Not Markdown-specific, but it runs on every commit.
- `pre-push` – runs the four shared checks, `pnpm check:markdown` among them, so a finding fails the push rather than the commit. It stops at the first failure, so run the checks yourself for the complete list.

Three workflows cover the same ground on a pull request, and each is stricter about something the local tools are not:

- `.github/workflows/check.yml` runs `check:format`, `check:lint`, `check:markdown`, and `check:types` as separate steps, so one run reports every failure.
- `.github/workflows/build_guidebook.yml` builds the guidebook when the pull request touches it. VitePress fails the build on a dead internal link, which is the only thing in the toolchain that checks a link at all.
- `.github/workflows/check_skills.yml` validates every `SKILL.md` – its frontmatter shape, its relative links, and whether a changed skill bumped `metadata.version`.

The markdown check does not run on commit, and no editor runs it on save. Run `pnpm format` then `pnpm check:markdown` yourself before handing work back – separate steps, so one pass reports every failure.
