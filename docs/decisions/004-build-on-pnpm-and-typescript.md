# 004. Build on pnpm and TypeScript

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The package manager, the language, the module system, and the runtime sit below every other choice. Tooling cannot be configured until they are settled, and every contributor – human and agent – needs to start from the same base. Kept few, they leave the choices above them open.

## Decision

We build on a fixed baseline:

- **pnpm** is the package manager, pinned by `packageManager` in `package.json`, and the monorepo is one pnpm workspace.
- **TypeScript** is the language, everywhere.
- **ESM** is the module system – `"type": "module"`, and no CommonJS.
- **Node.js LTS** is the runtime – the current long-term support release, pinned to one version in `.tool-versions`.

Everything above the baseline – the front-end framework, the back-end language, the data stores – is decided in its own record.

## Consequences

- Every package, script, and tool assumes one manager, one language, one module system, and one runtime, so configuration is shared rather than negotiated per package.
- Pinning pnpm and Node keeps every machine and every runner on the same versions.
- A package that is still CommonJS-only causes occasional friction.
- A back-end that is not Node sits outside the baseline, beside the Node toolchain rather than in it.

## Alternatives considered

- npm or Yarn – both manage workspaces, but pnpm's content-addressed store is faster and stricter about resolution, which suits a monorepo.
- JavaScript – quicker to write in the very small, but without the type safety and editor support a project meant to be handed over depends on.
