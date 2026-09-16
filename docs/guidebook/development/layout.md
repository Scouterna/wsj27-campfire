# Repository layout

Where everything sits, and what belongs in each directory. Why the code is divided this way – the boundaries, and what may depend on what – is [Code organization](../architecture/code-organization).

```text
.
├── apps/          the deployable apps – web, and the shells apple and android
├── libraries/     generic, reusable packages – host, ui, utils
├── modules/       feature modules, one per capability – authentication, home, journey, participants
├── tools/         development tooling that ships to nobody – mock, the back-end stand-in
├── config/        shared tooling configuration, one directory per tool, plus environments/
├── scripts/       the shell and Node scripts the root pnpm scripts run
├── docs/          the decisions, this guidebook, and the C4 architecture model
├── .agents/       the agent definitions, the skills, and the per-branch spec scratch
├── .githooks/     the git hooks pnpm install wires up
└── .github/       the workflows, the issue and pull request templates, and the community files
```

One monorepo holds all of it, so a change that crosses a boundary is one commit, one pull request, and one review ([ADR 002](/decisions/002-organize-as-a-single-monorepo)). The back-end services are the exception: they are Python, they live one repository per service, and they are not here ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)).

## The four workspace roots

`pnpm-workspace.yaml` lists four globs – `apps/*`, `libraries/*`, `modules/*`, and `tools/*` – and every directory under them that carries a `package.json` is a workspace package. Packages are named `@scouterna/wsj27-campfire-<name>` and versioned together at the repository's own version. They depend on each other with `workspace:*`, never a published range.

Two directories under `apps/` are not packages. `apps/android` is a Gradle build and `apps/apple` an Xcode project; neither has a `package.json`, and both are driven entirely by named root scripts, so the native directories stay purely native.

## Nothing but the web application is built

Every library and module exports raw TypeScript straight from `src`, and its `package.json` points its main export at `./src/index.ts`. There is no per-package build step, no `dist`, and no build order to keep straight. `apps/web` is the only package with a `build` script, and Vite compiles the whole graph from source in one pass; `tools/mock` runs its TypeScript directly on Node, which is why its own imports carry the `.ts` extension the runtime insists on.

The cost is that a package is only consumable inside this workspace. That is the intent: none of them is published, and the day one has to be is the day it earns a build.

## What is inside them

Each package is real – a manifest, a source tree, an export surface, and, everywhere but `apps/web`, its own tests. The four modules each own one capability: `authentication` the sign-in screen and the session client, `home` the start screen, `journey` the countdown widget, and `participants` the list of participants with its screens, widgets, and queries. `libraries/ui` holds the design system and the two registries, `libraries/host` the tier detection and the bridge to the shells, and `libraries/utils` `stringOrFallback`, the `fetch` wrapper, and the session's role set. `apps/web` composes them – the route table, the widget table, the session gate, the two chromes, and the query client. `tools/mock` serves both back-end contracts in full, against a seeded list of participants. [Modules](../architecture/modules) and [Applications](../architecture/applications) describe each part.

A module owns its Playwright walk-throughs the same way it owns its screens, in a `test-ui/` directory beside `src/` – see [UI tests](../testing/ui).

## Where the configuration lives

`config/` holds one directory per tool – Prettier, markdownlint, commitlint, Detekt, SwiftFormat, SwiftLint, Storybook, Playwright, Vite, VitePress, and Vitest – so the repository root stays readable and a tool's settings are findable by name ([ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)). Three things sit outside that rule on purpose:

- **ESLint's flat config is the root `eslint.config.ts`**, because it expresses per-path rules directly rather than through a tool that resolves them.
- **`.editorconfig` is at the root**, because it is found by walking up from the file being edited, and ktlint reads its Kotlin rules from that same walk.
- **`config/environments/`** holds the three [environments](./environments) rather than a tool: a `Caddyfile` each, a `compose.yaml` for dev and prod, and the `Dockerfile` and `image.Caddyfile` that build the deployable image.

Where a tool insists on a file at the root, that file is a one-line re-export of the real one. `docs/.vitepress/config.ts` re-exports `config/vitepress/config.ts`, and reads as a pointer rather than as a place to edit.

## Where the agent material lives

Everything an agent reads lives under `.agents/` – the definitions in `.agents/agents/`, the skills in `.agents/skills/`, and the per-branch spec scratch in `.agents/specs/`, which is gitignored. Each harness looks for that material somewhere else, so a symlink points it there rather than a copy: `.claude/agents` and `.claude/skills` point into `.agents/`, `.github/agents/<name>.agent.md` points at one definition, and every `CLAUDE.md` in the repository is a symlink to the `AGENTS.md` beside it.

markdownlint follows a symlinked directory, so each of those symlinks is in the `ignores` list in `config/markdownlint/markdownlint-cli2.jsonc` and the real files are linted once at their real paths. Prettier refuses a symlink outright and needs no entry.
