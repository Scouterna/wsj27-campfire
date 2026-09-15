# Libraries

Read the [root `AGENTS.md`](../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true of the shared packages under `libraries/` – `host`, `ui`, and `utils` – the generic packages every module may reach for. The division is the guidebook's [code organization page](../docs/guidebook/architecture/code-organization.md), decided in [ADR 016](../docs/decisions/016-compose-the-web-application-from-feature-modules.md).

Three libraries exist, and each one is generic by construction:

- `host` – which tier the application is running in, a browser or a shell's webview. No dependencies at all, not even React.
- `ui` – the design system: the tokens, the five themes and their machinery, the display face, Storybook's own scaffolding, and the components.
- `utils` – what more than one package needs: the string reader, the `fetch` wrapper, and the session's role vocabulary with its ambient provider.

## The line between a library and a module

**A library that knows a feature is a feature module in the wrong place.** `ui` knows what a wordmark is; it does not know what a participant is. `host` knows what a tier is; it does not know which screens care. When a component starts taking a domain type as a prop, it belongs to the module that owns that type.

The test is portability: a package that would still make sense in a product that is not Campfire is a library, and a package that only makes sense here is a module.

Libraries do not import modules, they do not import an app, and they do not import each other. A library that needs something another library has is a sign that the something belongs in the one that already has the dependents.

## Every library

- Each package is named `@scouterna/wsj27-campfire-<name>`, is `private`, is `"type": "module"`, carries the repository's version, and exports `./src/index.ts`. `ui` carries one second export condition, `./styles.css`, and nothing else carries a second. There is no build step: Vite compiles the raw TypeScript together with the application.
- A library depends on the platform, on React where it draws or provides context, and on nothing in the workspace – today none of the three has a workspace dependency at all.
- `src/index.ts` is the public surface, and it is documented as a contract: parameter constraints, return cases that mean different things, errors a caller handles differently, side effects, invariants. A caller cannot read the implementation to find out.
- Unit tests are `*.test.ts` beside what they cover, in the hand-written project each package has in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts) ([ADR 022](../docs/decisions/022-test-typescript-with-vitest.md)).

## host

Today `host` is one fact: `host.tier`, computed once at module evaluation from the webview's User-Agent and frozen. Detection reads the `CampfireShell` token; no token – and no `navigator` at all, which is what Node and a worker have – is the browser tier rather than a crash at import time.

- The answer is frozen because every reader must see the same one. A tier that could be reassigned is a tier two components could disagree about.
- It is computed synchronously, before React renders anything, which is what keeps the wrong chrome off the screen for a frame. Nothing here may become asynchronous or wait on a message.
- **The bridge is the design and is not here** ([ADR 018](../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). It lands as versioned messages – every one carrying `"v": 1` – and senders that are no-ops in the browser tier so a caller can call them unconditionally, and `host` answers `platform` and `version` alongside `tier` by then. A message shape is then a contract two shipped apps hold: add, never repurpose, and drop an unrecognized message rather than guess at it. A change an older shell could not understand ships as a second message rather than a reshaped one, and every such change has counterparts in `apps/apple` and `apps/android`, and in the tests beside all three.
- **Nothing here is a color, a font, a size, or a layout value, and nothing here ever will be.** A theme will cross as a name, never as a value; each shell owns its own palette ([Design](../docs/guidebook/design/index.md)).

## ui

Two export conditions: `.` for everything importable, and `./styles.css` for the one global stylesheet. Artwork and the styles that belong to no single component live in `assets/`, a sibling of `src/`; everything importable lives in `src/`, grouped by what it is.

```text
libraries/ui/
├── assets/
│   ├── styles.css                 the aggregator behind the ./styles.css export
│   ├── styles/                    tokens.css, fonts.css, reset.css, base.css
│   ├── images/                    the wordmark, one SVG cut per theme
│   └── fonts/bravelyscript.woff2  Bravely Script, the contingent's display face
└── src/
    ├── assets.d.ts                a .css or .svg import is Vite's business, told to TypeScript
    ├── components/                one directory per component – button/, logo/
    ├── foundations/theme/         the five names, the provider machinery, the unit-to-theme table
    └── storybook/                 the three decorators, stories.css, Introduction.mdx
```

- **Where a file goes.** A stylesheet, font, or image that belongs to no single component goes in `assets/`. A component's own `Name.css` stays beside its `Name.tsx` and `Name.stories.tsx`, and the component imports it, so the CSS arrives with the component rather than from a central list. `assets/styles.css` gathers the global sheets and nothing else, and its order is load-bearing – tokens first, because every rule below reads them with no fallback.
- **Folder names are single words, lowercase, without hyphens** – `logo`, `theme`. A component is a file named after it in PascalCase, in a directory of its own; everything else is kebab-case, and `unicorn/filename-case` allows those two cases and nothing else.
- **A component takes one `props` object** typed as an exported `XxxProps` type declared beside it, every field `readonly` and every field documented.
- **Raw values live in `assets/styles/tokens.css` and nowhere else.** A component names a role – `--color-theme-bright`, `--typography-display-font_family` – and never a hex code. Color, spacing, radius, and the display face are tokens; the type scale is not, and a screen's own tuned poster values stay in the screen until a second surface wants them.
- **The five themes** are the contingent's color identities: blue, brown, green, red, and yellow, with blue the default. The values are the five badge marks' own – the outer ring is the bright, the inner disc the ink – so the marks are the palette's source of truth, and a value that drifts from them is wrong. A theme is described in two places – its pair in `tokens.css`, where `[data-theme="<name>"]` repoints `--color-theme-bright` and `--color-theme-ink` rather than every rule that reads them, and its name in `src/foundations/theme/Theme.ts` – so adding one is a change in both. No color crosses into a shell today: each shell carries the tonal blue for its launch surface, and that is the whole of it. The design is that a theme crosses as a name and each shell maps it to a palette of its own, which puts the five identities in three places and makes a change to one a change in all three.
- **A theme name arrives from outside** – a stored preference, a query parameter, Storybook's toolbar – so `isTheme` checks it rather than asserting it. `applyInitialTheme` stamps the remembered or requested one on the document before React boots, and the application's session gate resolves the signed-in one above the screens.
- **No inline `style` props.** Styles live in CSS, written into the cascade layers `apps/web/index.html` declares – `tokens, fonts, reset, base, component, screen` – so load order cannot decide which rule wins.
- **Font sizes are `calc(<N>rem / 17)`** against the 17-point base `base.css` sets, never a bare `px`, so Dynamic Type carries the reader's own text size through every role.
- **One display face.** Bravely Script is the jamboree's face and the only one shipped; body text is `system-ui` on purpose. Only a regular weight is drawn, so the weight is a token too – asking for bold would have the browser synthesize one, and a synthesized script is a smear.
- **Storybook's own files sit in `src/storybook/`.** `ThemeDecorator` wraps every story in the unit color the toolbar picked, on a wrapper rather than on the document, so a story that themes itself still wins locally. `RouterDecorator` is the placeholder that will give a story the routing context the application gives its screens. `ColumnDecorator` wraps a full-width component's story in the phone-width column from `stories.css`, applied per story file. `stories.css` holds the canvas furniture any story may use, and `Introduction.mdx` is the landing page. None of it ships, which is why `stories.css` is not in `assets/`, and the theme and router decorators are registered once in `config/storybook/preview.tsx` rather than story by story.
- **`src/assets.d.ts`** tells TypeScript that a `.css` import is Vite's business. Declare a new asset type here rather than relying on another package's declaration – the repository type-checks as one program, so a missing declaration can be invisible until the day that package moves.
- **The two registries are the design and are not here** ([Navigation and routing](../docs/guidebook/architecture/layers/navigation.md), [Presentation layer](../docs/guidebook/architecture/layers/presentation.md)). `RouteRegistry`, the branded `Address` type, the route helpers, and `WidgetRegistry` land in this package when the router does. They keep a literal type per path, which is what makes every link in the product checked, so preserve the generics: widening one to a catch-all silently turns the whole product's routing into `any`. A registry is augmented by the module that owns the address or provides the widget, never here.

## utils

The bar for adding something is that a second package already wants it. A helper with one caller belongs beside that caller, where it can change without touching a package everything depends on.

- `stringOrFallback(value, fallback)` reads a string out of untyped input – a JSON body, a query parameter, a build setting – so "the key was missing" and "the key held a number" reach the caller as the same harmless answer rather than as two different crashes.
- The `fetch` wrapper distinguishes three outcomes – the request reached nothing, the service answered a refusal, the answer was not JSON – names the URL in the error and keeps `cause`, and the refusal carries its status, because a caller telling a 403 from a 404 is the difference between a second request and a wrong screen. It is the transport inside a query function, never a way around the application's query cache ([Data layer](../docs/guidebook/architecture/layers/data.md)).
- The role vocabulary – the closed `Role` set, the helpers, and the ambient `RolesProvider`/`useRoles` the application mounts at its session gate – lives here because this is the one package every module may import. Translating a provider's spellings into the set is not here: that is the authentication module's data layer.
- React appears here for exactly one reason, the ambient provider. Everything else stays free of React and the DOM, and a helper that needs either is not a utility.

## Stories, tests, and handing back

- Every `ui` component gets stories beside it as `Name.stories.tsx` ([ADR 023](../docs/decisions/023-catalog-the-ui-in-storybook.md)). Storybook indexes `libraries/ui/src/**/*.stories.tsx` and groups them under Foundations and Components by the story's `title`, not by its folder. A story's name and its rendered output are its description, which is the one exception to the rule that every export carries a JSDoc block.
- Components are proved in Storybook rather than by rendering tests, which is why the `ui` Vitest project runs in Node and not a DOM: the only logic it tests is pure – the theme names, the checks that read one from outside, and the unit-to-theme table.
- The coverage ratchet measures `libraries/host` and `libraries/utils`, alongside the mock. `libraries/ui` stays outside the denominator on purpose.
- Run `pnpm test` and the four checks – `check:format`, `check:lint`, `check:markdown`, `check:types` – as separate commands before handing work back, plus `pnpm build:web` and `pnpm build:storybook` for anything a story or the application imports.
