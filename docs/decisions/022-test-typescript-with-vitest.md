# 022. Test TypeScript with Vitest

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The repository is ESM-only TypeScript ([ADR 004](004-build-on-pnpm-and-typescript.md)) compiled by Vite ([ADR 014](014-build-the-web-application-on-react-with-vite.md)), from packages with no build step of their own. A test runner with its own transform would be a second answer to how TypeScript becomes JavaScript here, and the two would eventually disagree.

The code most worth testing is the pure functions everything stands on – which phase of the journey today falls in, whether a row from the API decodes, what happens to a bridge message with an unknown version. Much of it is agent-written, so review is the scarce thing ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)), and a test is review that keeps working.

## Decision

We test TypeScript with Vitest, configured once in `config/vitest/`, and run the whole suite with `pnpm test`.

- **One project per package with tests, listed by hand**, so the configuration says what is tested.
- **Every project runs in the `node` environment.** Nothing renders a component.
- **Tests live beside the code they test**, and move and get deleted with it.
- **`pnpm test` is a check like the four** – before handing work back, in the pre-push hook ([ADR 008](008-check-commits-with-git-hooks.md)), and in continuous integration ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)). Coverage is on, over the logic the screens stand on, held to a ratchet rather than a target.

## Consequences

- There are no component or DOM tests. Screens are seen in the catalog and driven by their module's walk-through.
- A package can grow a test file that never runs, because nothing checks the hand-written list.
- The application, the tests, and the catalog share one transform, so a resolution change lands in one place for all three.
- The mock's TypeScript runs two ways – by Node when it serves, through Vitest when it is tested ([ADR 021](021-develop-against-a-mock-back-end.md)) – and a difference between them would be a confusing bug.

## Alternatives considered

- Jest – awkward ESM support, and a second transform beside Vite's.
- `node:test` – thinner watch mode, filtering, and reporters, and no path to a browser-like environment.
- Browser-level tests as the only layer – slow, and the pure functions tested through three layers of indirection.
