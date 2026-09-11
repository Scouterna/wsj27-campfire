# The checks

A change has to pass the checks before it leaves the machine. Four of them are shared – pure Node and TypeScript, and they cover the whole repository at once. The other four belong to the shells, and only run where that platform's toolchain is installed.

| Check                       | What it runs                               |
| --------------------------- | ------------------------------------------ |
| `pnpm check:format`         | Prettier, in check mode                    |
| `pnpm check:lint`           | ESLint, with `--max-warnings 0`            |
| `pnpm check:markdown`       | markdownlint                               |
| `pnpm check:types`          | `tsc --noEmit`, across the whole workspace |
| `pnpm check:apple:format`   | SwiftFormat, in lint mode                  |
| `pnpm check:apple:lint`     | SwiftLint, with `--strict`                 |
| `pnpm check:android:format` | ktlint, in check mode                      |
| `pnpm check:android:lint`   | Detekt and Android Lint                    |

Alongside them, `pnpm test` runs the TypeScript tests across every package that has them, `pnpm test:web:ui` walks each module's screens in a real browser, and the shells have their own – `pnpm test:android` and `pnpm test:apple`. The [Testing](../testing/) chapter is where those live.

`pnpm format` repairs formatting for the shared layer, and `format:apple` and `format:android` write native fixes. Lint and Markdown findings are fixed by hand, or in the editor.

A ninth check stands apart: `pnpm check:arch` validates the C4 model and inspects it for a missing description, a container with no technology, an unlabeled relationship, or an element no view shows. It pulls a large Docker image, so it is not in the `pre-push` hook and is run when the model changes – see [the architecture model](../architecture/).

## What each tool owns

- **Prettier** formats everything it has a parser for, which here includes the Android XML: `@prettier/plugin-xml` reindents the manifest and the resource files while `xmlWhitespaceSensitivity: "preserve"` leaves the text inside an element verbatim, so a Swedish string keeps its spacing. Swift, Kotlin, and shell are listed in `config/prettier/prettier.ignore` rather than skipped in silence, because "check:format passed" should not read as "these were checked".
- **ESLint** is one flat config at the repository root covering every package, type-aware and strict, with the rules that are not repository-wide expressed as path blocks in the same file: the browser's globals and React's rules of hooks for the code that runs in a browser, and a ban on reaching upward for the code that must not. Markdown is markdownlint's alone.
- **markdownlint** reads every `*.md` in the repository, skipping the symlinked directories so the real files are linted once at their real paths.
- **`tsc`** type-checks the whole workspace from one `tsconfig.json`, which is also the project ESLint's type-aware rules read.

## There is no single command, on purpose

Nothing runs all of them together. Running them as separate commands means one pass reports every failure instead of stopping at the first, and that is the same reason continuous integration runs them as separate steps ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)). A round trip costs a push; a second command costs nothing.

So the handback ritual is five commands – the four checks and `pnpm test` – plus the platform's own three where a shell was touched.

## A warning is a failure

The four dialects say it four ways, and they say the same thing. ESLint runs with `--max-warnings 0`. SwiftLint runs with `--strict`, so its default-warning rules fail too. ktlint and Detekt both set `ignoreFailures` to false, and Android Lint sets `warningsAsErrors` and `abortOnError` ([ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)).

A warning nobody has to act on becomes a warning nobody reads. The cost of the strict setting is that a rule which fires on something legitimate has to be switched off deliberately, in the configuration, with a comment saying why – which is the outcome worth having.

## The git hooks

`pnpm install` points git at `.githooks` through the `prepare` script. Two hooks run automatically, and both can be skipped with `--no-verify` when that is genuinely the right call ([ADR 008](/decisions/008-check-commits-with-git-hooks)).

- **`commit-msg`** holds the subject to the [commit rules](./conventions) through commitlint. It needs pnpm, and fails the commit without it.
- **`pre-push`** runs the checks. Committing stays free, and the cost lands at the point where the work could reach somebody else.

The `pre-push` hook runs the four shared checks and `pnpm test` always – they need only Node, and they are what the repository is built on. Then it runs the Kotlin checks and tests if a JDK and an Android SDK are both really there, the Swift checks if SwiftFormat and SwiftLint are, and the Swift tests if Xcode is. A missing toolchain is skipped out loud rather than in silence, because a check nobody knows was skipped is worse than one that did not run.

Two details in that hook are worth knowing, because both were bugs first. It asks whether a tool is usable by running it, not by looking it up on the PATH – macOS ships stubs at `/usr/bin/java` and `/usr/bin/xcodebuild` that exist on every machine and fail when invoked, so `command -v` answers yes for a toolchain nobody installed. And it requires the Android SDK as well as the JDK, because a machine with only the JDK passes a java-only gate and then fails the push on Gradle's "SDK location not found", which is exactly the obscure message the hook exists to turn into a skip.

The hook stops at the first failure, unlike continuous integration. It runs `set -e` and the checks in sequence, so the finding that matters stays on screen instead of scrolling away behind the checks that follow. The work is not leaving the machine either way, so run the checks yourself when you want the complete list.

For Swift, the hook is the whole gate. There is no Apple continuous integration – see [Continuous integration](./continuous-integration).
