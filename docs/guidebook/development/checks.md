# The checks

A change passes the checks before it leaves the machine. The shared checks need only Node and cover the whole repository at once. Each shell has its own, which run where that platform's toolchain is installed. Each tool owns one kind of file, so no finding is reported twice and nothing falls between two tools ([ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)).

| Check                       | Tool                    | Covers                                                                                    |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm check:format`         | Prettier                | Every file it has a parser for, the Android XML included                                  |
| `pnpm check:lint`           | ESLint                  | All TypeScript, type-aware, from one flat config at the root                              |
| `pnpm check:markdown`       | markdownlint            | Every Markdown file, each linted once at its real path                                    |
| `pnpm check:types`          | `tsc --noEmit`          | The whole workspace, from one `tsconfig.json`                                             |
| `pnpm check:android:format` | ktlint                  | The Kotlin, by the rules in `.editorconfig`                                               |
| `pnpm check:android:lint`   | Detekt and Android Lint | The Android shell                                                                         |
| `pnpm check:apple:format`   | SwiftFormat             | The Swift                                                                                 |
| `pnpm check:apple:lint`     | SwiftLint               | The Apple shell                                                                           |
| `pnpm check:arch`           | Structurizr, in Docker  | The C4 model – that it parses, every element is described, and every relationship labeled |

A few details in that table matter in practice:

- **Prettier and the Android XML.** The XML plugin reindents the manifest and the resource files but leaves the text inside an element as written, so a Swedish string keeps its spacing.
- **What Prettier skips.** Swift, Kotlin, shell scripts, and SVG are listed in Prettier's ignore file rather than skipped in silence, so a passing `check:format` never reads as covering them. Their own tools own them.
- **One ESLint config.** The rules that are not repository-wide are path blocks in the same file – the browser's globals and React's rules of hooks for the code that runs in a browser, for instance. The same `tsconfig.json` that `tsc` checks is the program ESLint's type-aware rules read.
- **The architecture model.** `check:arch` pulls a large Structurizr image, so the `pre-push` hook leaves it out, and continuous integration runs it when the C4 model in `docs/architecture/` changes.

`pnpm format` repairs the shared formatting, and `format:android` and `format:apple` the native. Lint and Markdown findings are fixed by hand.

The tests sit beside the checks – `pnpm test`, `test:web:ui`, `test:android`, and `test:apple` – and the [Testing](../testing/) chapter covers them.

## A warning is a failure

Every linter runs strict. ESLint runs with `--max-warnings 0` and SwiftLint with `--strict`, ktlint and Detekt are set not to ignore failures, and Android Lint treats warnings as errors. A warning nobody has to act on becomes a warning nobody reads ([ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)).

The cost is that a rule which fires on something legitimate has to be switched off deliberately, in the configuration, with a comment saying why. A looser baseline is never the escape.

## Separate commands

No script runs every check at once. Run as separate commands, one pass reports every failure instead of stopping at the first, which is also why continuous integration runs them as separate steps ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)).

Before handing work back, run the four shared checks and `pnpm test`. Work that touched a shell adds that platform's checks and tests.

## The git hooks

`pnpm install` points git at `.githooks`, so the hooks need no setup of their own. A failing hook is fixed, never skipped with `--no-verify`, and continuous integration checks the same things again as the backstop ([ADR 008](/decisions/008-check-commits-with-git-hooks)).

- **`commit-msg`** holds the subject to the [commit rules](./conventions) through commitlint, because the commit type decides the next version and a malformed subject is a broken input to the release.
- **`pre-push`** runs the shared checks and `pnpm test`, then the Kotlin checks and tests when a JDK and an Android SDK are both present, the Swift checks when SwiftFormat and SwiftLint are, and the Swift tests when Xcode is.

The checks run at the push rather than the commit, so committing stays free and the cost lands where the work could reach someone else. The hook judges the whole tree, so it asks the same question a pull request will.

The hook asks whether a toolchain is usable by running it, because macOS ships stubs for `java` and `xcodebuild` that exist on every machine and fail when called. It needs the Android SDK as well as the JDK, because a JDK alone passes a Java-only gate and then fails the push on Gradle's missing SDK. A missing toolchain is skipped out loud and the push goes ahead.

Unlike continuous integration, the hook stops at the first failure, so that finding stays on screen instead of scrolling away behind the checks that follow. Run the checks yourself for the complete list.

For Swift the hook is the whole gate, because there is no Apple [continuous integration](./continuous-integration).
