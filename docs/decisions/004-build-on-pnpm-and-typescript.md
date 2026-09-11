# 004. Build on pnpm and TypeScript

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

A project cannot start from nothing. Before a framework, a data store, or a feature can be chosen, a few foundations have to be settled so tooling can be configured and every contributor – human and agent – starts from the same base: the package manager, the language, the module system, and the runtime. They are the choices below every other choice, so they are kept few and the room above them stays open.

## Decision

We build on a fixed baseline:

- **pnpm** is the package manager, pinned by `packageManager` in `package.json`, and the monorepo is one pnpm workspace.
- **TypeScript** is the language, everywhere.
- **ESM** is the module system – `"type": "module"`, and no CommonJS.
- **Node.js 24** is the runtime, pinned in `.tool-versions`.

Everything above the baseline – the front-end framework, the back-end language, the data stores – is decided later, in its own record.

## Consequences

- Every package, script, and tool can assume one manager, one language, one module system, and one runtime, so configuration is shared rather than negotiated per package.
- Pinning pnpm and Node keeps every machine and every runner on the same versions.
- ESM-only means occasional friction with a package that is still CommonJS-only, and no migration away from CommonJS later.
- TypeScript stays on 6.x until `typescript-eslint` accepts 7, because its type-aware rules need the JavaScript compiler API. Everything moves to 7 in one step, so one compiler decides what the types are.
- A back-end that is not Node sits outside this baseline and coexists with the Node toolchain rather than joining it.

## Alternatives considered

- **npm or Yarn.** Both manage workspaces. pnpm's content-addressed store is faster and stricter about resolution, which suits a monorepo.
- **JavaScript.** Faster to write in the very small. It gives up the type safety and the editor support that a project meant to be handed over depends on.
- **CommonJS, or dual CJS and ESM.** ESM is where the ecosystem and Node are going, and supporting both adds packaging complexity for no benefit on a greenfield project.
- **An older Node LTS.** Maximum compatibility, for a project with no legacy runtime to be compatible with.
