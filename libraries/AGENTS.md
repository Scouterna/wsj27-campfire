# Libraries

Read the [root `AGENTS.md`](../AGENTS.md) first. This file is what is true only of the shared packages under `libraries/`, which every module may reach for. The division between libraries, modules, and the application is the guidebook's [Code organization](../docs/guidebook/architecture/code-organization.md) page ([ADR 016](../docs/decisions/016-compose-the-web-application-from-feature-modules.md)).

- `host` – which tier the application runs in, a browser or a shell's webview.
- `ui` – the design system, the route and widget registries, and Storybook's own scaffolding.
- `utils` – what more than one package needs: the string reader, the `fetch` wrapper, and the ambient session.

## A library knows no feature

A package that would still make sense in a product that is not Campfire is a library; one that only makes sense here is a module. When a component starts taking a domain type as a prop, it belongs to the module that owns that type.

Two exceptions name the contingent's own facts, because every module needs them and no module can import another:

- **`utils` holds the session's vocabulary** – the roles and the signed-in `User` – because no module can import the one that resolved it ([ADR 032](../docs/decisions/032-hold-the-signed-in-person-in-utils.md)).
- **`ui` holds the contingent's visual identity** – the themes, each unit's theme, the units' names and glyphs, and the reveals that time what the product shows – because every module draws with it.

The exceptions are those and nothing else. A participant, a unit's people, or a trip's dates are a module's.

A library imports no module, no app, and no other library. A library that needs what another has is a sign that the thing belongs in the one that already has it.

## Every library

- The package is `@scouterna/wsj27-campfire-<name>`, private, and exports `./src/index.ts`. `ui` alone adds a second export, `./styles.css`.
- A library depends on the platform and on React where it draws or provides context – never on the workspace.
- `src/index.ts` is documented as a contract, as the root's Comments section describes, because a caller cannot read the implementation.
- Unit tests are `*.test.ts` beside what they cover, in the package's own project in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts) ([ADR 022](../docs/decisions/022-test-typescript-with-vitest.md)). The coverage ratchet measures `host` and `utils`; `ui` stays out, because its components are proven in Storybook.

## host

`host.tier` is computed once, at module evaluation, from the `CampfireShell` token in the User-Agent, and frozen. No token – or no `navigator` at all, as in Node – is the browser tier rather than a crash.

- It is frozen so every reader sees the same answer, and synchronous so the wrong chrome never shows for a frame. Nothing here may wait on a message.
- The bridge's web half lands here, with senders that are no-ops in the browser so a caller calls them unconditionally. [The bridge](../docs/guidebook/architecture/layers/bridge.md) has the contract and how it may change.
- Nothing here is a color, a font, a size, or a layout value. A theme crosses as a name.

## ui

```text
libraries/ui/
├── assets/
│   ├── styles.css     the aggregator behind the ./styles.css export
│   ├── styles/        tokens.css, fonts.css, reset.css, base.css
│   ├── images/        the wordmark, one cut per theme
│   └── fonts/         Bravely Script, the display face
└── src/
    ├── assets.d.ts    a .css or .svg import is Vite's business, told to TypeScript
    ├── behavior/      the view-transition direction contract
    ├── components/    one directory per component
    ├── foundations/   the icons, the themes, the reveals, and the units' identities
    ├── routing/       RouteRegistry, Address, matchScreen, mountRoutes, and the root route
    ├── storybook/     the decorators, stories.css, and Introduction.mdx
    └── widgets/       WidgetRegistry, WidgetFrom, WidgetsProvider, and Widget
```

- **Where a file goes.** A stylesheet, font, or image that belongs to no single component goes in `assets/`. A component imports its own `Name.css` from beside it, so the CSS arrives with the component. `assets/styles.css` gathers the global sheets, tokens first, because every rule below reads them with no fallback.
- **Folder names are one lowercase word**, without hyphens.
- **Raw values live in `tokens.css` and nowhere else.** A component names a role – `--color-theme-bright` – never a hex code.
- **A theme is the unit's color identity**, taken from its badge mark – the outer ring is the bright, the inner disc the ink – so the marks are the palette's source of truth. A theme is its pair in `tokens.css` and its name in `src/foundations/theme/Theme.ts`, so adding one changes both. A theme name arrives from outside, so `isTheme` checks it rather than asserting it.
- **A unit's theme** comes from `UnitTheme.ts`, keyed by the unit's number, because the list of participants knows only the number.
- **The units' names and glyphs are runtime data**, not code. The application loads them and hands them to `UnitIdentitiesProvider`, and anything reading `useUnitIdentities` outside a provider, or before they load, gets nothing and falls back to the number.
- **A reveal is a moment part of the product becomes visible**, with its time and the hint under its countdown. `ui` holds the reveals, and what a reveal's id gates is each consumer's business.
- **A `style` prop carries only a value the runtime alone knows**, such as a virtualized row's offset. Everything a rule could say goes in the cascade layers `apps/web/index.html` declares.
- **Font sizes come from the `--font-size-*` tokens**, in rem against the 17-point base, never a bare `px`, so Dynamic Type carries the reader's text size. Weights are tokens too.
- **One display face.** Bravely Script is drawn in one weight, so asking for bold makes the browser synthesize a smear. Body text is `system-ui` on purpose.
- **Storybook's files sit in `src/storybook/`** and never ship. The theme and router decorators are registered once in `config/storybook/preview.tsx`; `ScreenDecorator` is on the public surface because the modules' screen stories apply it.
- **Declare a new asset type in `src/assets.d.ts`** rather than relying on another package's. The repository type-checks as one program, so a missing declaration stays hidden until that package moves.
- **Preserve the registries' generics.** `RouteRegistry` keeps a literal type per path, which is what checks every link in the product; widening one to a catch-all turns all routing into `any`. A registry is augmented by the module that owns the address, never here.

## utils

The bar for adding something is that a second package already wants it. A helper with one caller belongs beside that caller.

- `stringOrFallback` reads a string from untyped input, so a missing key and a wrong type reach the caller as the same harmless answer.
- The `fetch` wrapper tells apart a request that reached nothing, a refusal, and an answer that was not JSON, names the URL, keeps `cause`, and carries a refusal's status. It is the transport inside a query function, never a way around the query cache ([Data layer](../docs/guidebook/architecture/layers/data.md)).
- The roles and the signed-in `User` live here with their providers. Translating a provider's spellings into them is the authentication module's job, and a fact a second module needs is a new field on `User`, not a new provider.
- React is here only for those providers. A helper that needs React or the DOM is not a utility.
