# Scripts

Read the [root `AGENTS.md`](../AGENTS.md) first. This file is what is true only of `scripts/`, the command line behind the root `package.json`. What each script guarantees is the guidebook's [The scripts](../docs/guidebook/development/scripts.md) page.

- `start/` – the environments and the single servers, and `helpers.sh` they share.
- `android/` and `apple/` – the shells' own start, build, and test scripts.
- `release/` – the version rule, in TypeScript ([ADR 034](../docs/decisions/034-version-each-artifact-from-its-own-commits.md)).
- `structurizr/` – the pinned image and the runner behind `start:arch`, `build:arch`, and `check:arch`.

A root script runs one of these rather than carrying logic inline, so `package.json` stays a list of names.

## Shell scripts

- **POSIX `sh`, never bash.** Every script opens with `#!/bin/sh` and `set -eu`, so an unset variable or a failed command stops it. A sourced library sets nothing, because the sourcing script already has.
- **A header comment says what the script guarantees**, and what arguments it takes. A required argument fails with its usage – `"${1:?usage: test.sh <CampfireTests|CampfireUITests>}"` – and an optional one has a default – `"${1:-local}"`.
- **Run from anywhere.** A script resolves the repository from its own path, never from the working directory.
- **macOS is the target.** The shells' toolchains exist only there, and continuous integration runs no start script, so the system's own `lsof`, `ps`, `curl`, and `sed` are enough.
- **A start script goes through `start/helpers.sh`.** It frees a port before taking it and names what held it, reports a process only once it answers, and stops everything it started on Ctrl+C or the first failure. A new start script calls `free_port`, `start_process`, `wait_for`, `arm_trap`, and `supervise` rather than growing its own versions.
- **Nothing is killed quietly.** Output is for a person at the terminal, and a server that vanished with no explanation is worse than a busy port.
- **The shells' start scripts start no server.** They check that something answers on `:8000` and say what to start when nothing does.
- No tool formats or lints shell here – Prettier ignores it – so match the scripts beside it by hand.

## TypeScript scripts

- Node runs them directly by stripping types, so there is no build step, and every relative import carries its `.ts` extension. ESLint's `import-x/extensions` catches a missing one.
- A script's output is its interface and its exit code its result, so `console` and `process.exit` are allowed here and nowhere else.
- A script reads its state from git or the environment and writes nothing to the tree. `release/next-version.ts` refuses a shallow clone, because one sees no tags and would answer as though nothing was ever released.
- Tests are `*.test.ts` beside the code, in the `release` Vitest project, and `scripts/release/` is inside the coverage ratchet. A test that runs a script as a subprocess, in a throwaway repository, covers the rule it drives directly instead.
