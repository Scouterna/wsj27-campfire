# Repository layout

One monorepo holds the web application, the shells, and everything that builds and checks them, so a change that crosses a boundary is one commit, one pull request, and one review ([ADR 002](/decisions/002-organize-as-a-single-monorepo)). The back-end services are the exception: they live in repositories of their own and are not here ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)). Why the code is divided the way it is, and what may depend on what, is [Code organization](../architecture/code-organization).

```text
.
├── apps/
│   ├── web/           the React application
│   ├── android/       the Android shell, a Gradle project
│   └── apple/         the Apple shell, an Xcode project
├── modules/           feature modules, one per capability
├── libraries/         generic packages any module may use
├── tools/mock/        the back-end stand-in behind pnpm start:mock
├── config/            one directory per tool, plus environments/ for local, dev, and prod
├── scripts/           the shell and Node scripts behind the root scripts
├── docs/              the decisions, this guidebook, and the C4 model
├── .agents/           the agent definitions, the skills, and the per-branch spec scratch
├── .githooks/         the git hooks pnpm install wires up
└── .github/           the workflows, the issue and pull request templates, and the community files
```

## The workspace

`apps/*`, `modules/*`, `libraries/*`, and `tools/*` are the pnpm workspace roots, and every directory under them with a `package.json` is a package named `@scouterna/wsj27-campfire-<name>`. Packages depend on each other with `workspace:*` rather than a published range, and each says version `0.0.0`, because an artifact's version lives in a release tag rather than in the tree ([Release](../maintenance/release)).

`apps/android` and `apps/apple` are not packages. They are native projects with no `package.json`, driven entirely by root scripts, so the native directories stay purely native.

## Nothing but the web application is built

A module or library exports raw TypeScript from `src/index.ts`, with no build step, no `dist`, and no build order to keep straight. Vite compiles the whole graph from source when it builds the web application, and Node runs the mock's TypeScript directly. The cost is that a package can only be used inside this workspace, which is the intent – none of them is published.

A module is a capability – its screens, widgets, and queries – and a library is what any module may reach for: the design system, the bridge to the shells, and small shared utilities. `apps/web` composes them into one application, and [Modules](../architecture/modules) and [Applications](../architecture/applications) describe each part. A module also owns its Playwright walk-throughs, in a `test-ui/` directory beside `src/` ([UI tests](../testing/ui)).

## Where the configuration lives

`config/` holds one directory per tool – Prettier, markdownlint, commitlint, Vite, Vitest, Playwright, Storybook, VitePress, and the native linters – so the root stays readable and a tool's settings are found by its name ([ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)). A few things sit outside that rule on purpose:

- **ESLint's flat config is the root `eslint.config.ts`**, because it expresses per-path rules for the whole tree directly.
- **`.editorconfig` is at the root**, because editors find it by walking up from the file being edited, and ktlint reads its Kotlin rules from the same walk.
- **`config/environments/`** holds the three [environments](./environments) rather than a tool – their Caddy and Compose files, and the `Dockerfile` that builds the deployable image.

Where a tool insists on a file of its own elsewhere, that file is a one-line re-export of the real one in `config/` – `docs/.vitepress/config.ts` is the example – and is a pointer rather than a place to edit.

## Where the agent material lives

Everything an agent reads is under `.agents/`: the definitions, the skills, and the gitignored per-branch spec scratch. Each harness looks for that material somewhere else, so a symlink points it there rather than a copy – `.claude/agents` and `.claude/skills` into `.agents/`, `.github/agents/<name>.agent.md` at one definition, and every `CLAUDE.md` at the `AGENTS.md` beside it. markdownlint ignores each symlink, so every file is linted once at its real path.
