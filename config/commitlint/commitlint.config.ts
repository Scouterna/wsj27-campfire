import type { UserConfig } from "@commitlint/types"

// Commit message rules, enforced by the commit-msg hook in .githooks/.
// These mirror the Commit messages section of AGENTS.md; that file is the prose
// and this is the check, so a change to one wants the same change to the other.
//
// Conventional Commits' own preset is the base, narrowed so that a commit has no
// scope, a subject short enough to read in a log, no rule that only warns, and a
// revert checked like any other commit. The preset's other rules are enforced just
// the same without being restated – among them the body's 100-character lines and a
// non-empty subject with no trailing period.
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],

  // commitlint lets git's own `Revert "…"` subject through unchecked, and the release
  // rule in scripts/release/ reads only `revert:`, so a revert written that way would
  // earn no version and the change it undoes would stay released. Its default ignores
  // are off, and the one worth keeping – the fixups a rebase squashes away – is restated.
  defaultIgnores: false,
  ignores: [(message: string): boolean => /^(?:amend|fixup|squash)! /.test(message)],

  rules: {
    // The types, and no others.
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],

    // No scope. `feat(auth): …` is valid Conventional Commits and not valid here.
    "scope-empty": [2, "always"],

    // 50 characters is the aim and this the ceiling, so a subject still fits a terminal
    // `git log --oneline` without wrapping.
    "header-max-length": [2, "always", 72],

    // The preset makes these warnings, and commitlint exits 0 on a warning, so the
    // blank line AGENTS.md asks for would be accepted inside a `git commit` nobody
    // reads closely. Everywhere else here a warning is a failure (ADR 006).
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
}

export default config
