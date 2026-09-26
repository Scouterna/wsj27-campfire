# 015. Style the web application with plain, layered CSS

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The web application is React with no component framework, so every visible thing is Campfire's own. The contingent's graphic profile has a paper, an ink, the unit colors, and the jamboree's display face, and a person wears one unit color, so every component has to hold up in each. Inside the shells the text size is the reader's: iOS applies Dynamic Type to the webview, and a stylesheet written in pixels ignores it.

## Decision

We style the web application with plain CSS, in a stylesheet beside every component, on tokens the contingent's profile fills.

- **The cascade order is declared before any stylesheet loads.** `apps/web/index.html` names the layers – `tokens, fonts, reset, base, component, screen` – and every rule is written into one, so load order never decides which rule wins.
- **Raw values live in `tokens.css` and nowhere else.** A component names a role, such as `--color-theme-bright`, never a hex code or a size.
- **Themes swap through one pointer.** `[data-theme="<name>"]` moves `--color-theme-bright` to a unit color, so a rule names the theme color once. Blue is the default.
- **Sizes are rem against a 17-point base** – `calc(<N>rem / 17)`, never a bare `px` – and on iOS the root takes `font: -apple-system-body`, which is Dynamic Type itself. The base is 17 because that is iOS's body size where the web assumes 16 ([why the base is 17](https://joakimkemeny.com/writing/2024-09-05-dynamic-size/)).
- **Styling travels with the component**, in the `.css` file beside it. Its class names are part of the library's vocabulary, and a `style` prop carries only a value the runtime alone knows.
- **One display face.** Bravely Script is shipped for the wordmark, in its one drawn weight; body text is `system-ui`.

## Consequences

- Nothing compiles the styling, and nothing runs to apply it.
- Every component is checked in every theme – a component that reads well in blue and not in yellow is a bug.
- A layout has to survive the reader's text size, with no pixel to hide behind.
- The shells draw their own chrome, so each keeps its own copy of the unit colors, and a change is a change in three places or none.
- Layers replace specificity, so a rule written outside its layer wins or loses for a reason nobody can see in the file.

## Alternatives considered

- Tailwind, which other Scouterna projects use – we write plain CSS well, so it would only add a dependency and a layer between us and the stylesheet.
