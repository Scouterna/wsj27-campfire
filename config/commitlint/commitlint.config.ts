import type { UserConfig } from "@commitlint/types"

// Commit message rules, enforced by the commit-msg hook in .githooks/.
// These mirror the Commit messages section of AGENTS.md; that file is the prose
// and this is the check, so a change to one wants the same change to the other.
//
// Conventional Commits' own preset is the base, narrowed in three ways: this
// project uses no scope, it keeps subjects short enough to read in a log, and it
// has no warnings.
//
// The preset carries rules this file does not restate, and they are enforced
// just the same – body-max-line-length at 100 is the one AGENTS.md names, along
// with a non-empty subject that does not end in a period. Only the overrides
// below are listed here; the preset is the rest of the check.
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // The eleven types, and no others.
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

    // 50 characters is the aim; this is the ceiling, so a subject still fits a
    // terminal `git log --oneline` without wrapping.
    "header-max-length": [2, "always", 72],

    // The preset makes these two warnings, and commitlint exits 0 on a warning –
    // so the blank line AGENTS.md asks for was documented, warned about, and
    // accepted anyway, inside a `git commit` nobody reads closely. Everywhere
    // else here a warning is a failure (ADR 006), and these are the only two
    // rules that were not.
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
}

export default config
