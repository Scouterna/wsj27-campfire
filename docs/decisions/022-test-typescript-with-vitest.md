# 022. Test TypeScript with Vitest

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

This repository is ESM-only TypeScript ([ADR 004](004-build-on-pnpm-and-typescript.md)) compiled by Vite ([ADR 014](014-build-the-web-application-on-react-with-vite.md)), with packages that export raw source and have no build step of their own. A test runner with its own transform pipeline would mean two answers to how TypeScript becomes JavaScript here, and the two would disagree eventually – usually about a module resolution detail, usually on a Friday.

The code most worth testing is not the interface. It is the pile of pure functions everything else stands on – which phase of the journey today falls in, whether a row from the API decodes into a participant, what happens to a bridge message with a version the shell does not know. All of it takes values and returns values, and all of it is easy to get quietly wrong. That matters more here than elsewhere: much of this code is agent-written, so producing it is cheap and reviewing it is the scarce thing ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)), and a test is review that keeps working after the reviewer stops paying attention.

## Decision

We test TypeScript with Vitest, configured once in `config/vitest/`, and run the whole suite with `pnpm test`.

- **One project per package that has tests, written out by hand** rather than found by a glob. The configuration is a statement about what is tested, and adding a package to it is a deliberate line.
- **Every project runs in the `node` environment.** Nothing renders a component, and nothing needs a DOM.
- **Tests live beside the code they test**, so a file and its tests move, and get deleted, together.
- **`pnpm test` is a check like the four** – run before handing work back, in the pre-push hook ([ADR 008](008-check-commits-with-git-hooks.md)), and as its own step in continuous integration ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)). It runs with coverage on, over the logic the screens stand on and nothing else, held to a ratchet rather than a target.

## Consequences

- There are no component or DOM tests. Every screen and every widget is verified by eye in the component catalog and driven in a real browser by its module's walk-through. Closing that gap in Vitest means a jsdom project and a testing library, a decision for when the first screen is stable enough to pin down.
- The hand-listed projects are exactly as forgettable as they sound. A package can grow a test file that never runs, and nothing detects it.
- Vitest shares Vite's transform, so the application, the tests, and the catalog see the same TypeScript – one pipeline, one place a resolution change lands, for better and for worse.
- The mock's TypeScript runs two ways – by Node directly when it serves, and through Vitest's transform when it is tested ([ADR 021](021-stand-in-for-the-back-end-with-a-seeded-mock.md)). A difference between them would be a confusing bug.
- Vitest's configuration surface has changed shape between major versions. It is pinned under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md), so an upgrade is chosen rather than absorbed, and each one is an edit to a single file.

## Alternatives considered

- **Jest.** The largest ecosystem. Its ESM support is still the awkward path, and it needs its own transform beside the Vite build that already exists – two pipelines for the same files, in a repository that is ESM-only on purpose.
- **`node:test`.** No dependency, and Node runs TypeScript directly, so it would work for what is tested today. Thinner watch mode, filtering, and reporters, and no answer for the browser-like environment the missing DOM tests will need.
- **Bun's test runner.** Fast, and a second runtime beside the Node pinned in `.tool-versions`, the image, and every workflow – installed everywhere, to run tests and nothing else.
- **Browser-level tests as the only layer.** Closest to what a user does, slow, needs browsers on every machine that runs the checks, and leaves the pure functions – the code most likely to be wrong – tested through three layers of indirection. A browser layer belongs on top of this one, not in place of it.
- **A glob over the workspace.** A new package's tests would run the day they appear. It also decides for itself which environment a package wants, and makes "what is tested here" a question answered by running the suite rather than reading the configuration.
