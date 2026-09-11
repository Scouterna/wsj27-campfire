# 015. Style the web application with plain, layered CSS

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The web application is React with no component framework on top, so every visible thing is Campfire's own and something has to say how it looks. The contingent has a graphic profile to be faithful to – a paper, an ink, five unit colors, and the jamboree's display face – and a person wears one of the five colors, so every component has to hold up in each of them.

Inside the shells, the text size is the reader's. iOS applies Dynamic Type to the webview, and a leader who set large text in Settings expects the register to follow. A stylesheet written in pixels ignores them.

## Decision

We style the web application with plain CSS, in a stylesheet beside every component, on tokens the contingent's profile fills.

- **The cascade order is declared before any stylesheet loads.** `apps/web/index.html` names the layers – `tokens, fonts, reset, base, component, screen` – and every rule is written into one of them, so load order never decides which rule wins.
- **Raw values live in `tokens.css` and nowhere else.** A component names a role, `--color-theme-bright` or `--typography-display-font_family`, never a hex code or a size.
- **Five themes, swapped through one pointer.** `[data-theme="<name>"]` moves `--color-theme-bright` to one of the five unit colors, so a rule names the theme color once and follows whichever unit is in force. Blue, the contingent's own, is the default.
- **Sizes are rem against a 17-point base.** Every font size is `calc(<N>rem / 17)`, never a bare `px`, and on iOS the root becomes `font: -apple-system-body` – Dynamic Type itself.
- **Styling travels with the component.** The rules sit in the `.css` file beside it, its class names are part of the library's public vocabulary, and nothing sets a `style` prop; the prop is reserved for values only the runtime knows.
- **One display face, and the platform's own for everything else.** Bravely Script is shipped with the library and used for the wordmark, in the one weight that is drawn. Body text is `system-ui`.

## Consequences

- Nothing compiles the styling and nothing ships to do it at runtime. A stylesheet is what the browser gets.
- Every component is checked in five themes, not one. That is what the catalog's theme switcher is for, and a component that reads well in blue and not in yellow is a bug.
- A layout has to survive a reader's text size. There is no pixel to hide behind, and a row that fits at the default size and breaks at the largest is wrong at both.
- The palette is written more than once. The shells draw their own chrome natively, so each keeps its own copy of the five colors, and a change to the paper is a change in three places or none.
- Specificity stops being a question and layer discipline starts being one. A rule outside its layer wins or loses for a reason nobody can see in the file.

## Alternatives considered

- **A utility framework, such as Tailwind.** Fast to write and well known. It puts the design in class strings on every element instead of in a stylesheet a designer can read, and its palette and scale are its own, not the contingent's.
- **CSS-in-JS.** Styles beside the component, typed, and scoped. Also a runtime or a compiler between the stylesheet and the browser, for scoping the layers and the tokens already give.
- **A component library with a theme**, such as MUI or Radix Themes. Most of the interface for free, in someone else's shape. The contingent's profile is not a theme over another library's components, and Dynamic Type through rem is not something a library's scale accommodates.
- **CSS Modules.** Scoped class names with no runtime. The class names here are meant to be public – a module writes `className="logo"` as readily as it renders `<Logo>` – so the scoping removes the thing it protects.
