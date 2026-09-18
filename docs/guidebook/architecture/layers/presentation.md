# Presentation layer

Everything a person sees. A module's `ui/` directory holds three kinds of thing, and each has one job.

| Piece      | Job                                                                        |
| ---------- | -------------------------------------------------------------------------- |
| **Screen** | Answers at an address, and renders what a hook hands it                    |
| **Widget** | A piece another module's screen places by id, without importing the module |
| **Hook**   | Where the state comes from – the query, the derivation, the formatting     |

The split is what makes behavior testable without driving a browser: a hook can be exercised on its own, and a screen that formats nothing and decides nothing has little left in it worth a unit test. The screens are proven by walking them instead ([UI tests](../../testing/ui)).

## Screens

A screen is a React function component, and the module's route table is what gives it an address ([Navigation and routing](./navigation)). It takes what it draws from a hook beside it and renders it. It does not fetch, it does not validate, and it does not know which environment it is running in.

A screen that only learns its own name once data has arrived – a person's detail page – says so, rather than having the route table guess a title that is wrong for a second.

## Widgets

A widget is how one module's work appears on another module's screen without either importing the other. The providing module declares an id in `WidgetRegistry` and exports the table that fills it, the application merges the modules' tables into one `WidgetsProvider`, and the receiving screen places the widget by id:

```tsx
{
  isUnitsRevealed && <Widget id="journey:countdown" />
}
{
  isUnitsRevealed && isLeader && <Widget id="participants:unit" />
}
```

That is the home screen, and everything about it is home's own: what goes where, who sees it, and from when – both widgets wait behind the units reveal, and the unit widget is a leader's alone. The screen never learns which module drew what, and an id nobody registered renders nothing, which is what a story or a build assembled without that module should do.

A widget takes no props. What it needs it reads where it is used – its own queries, or the ambient session `utils` holds, the way the countdown reads the signed-in person with `useUser` to know whether the pre-trip is theirs. Nothing is threaded through the screen that places it.

## The session gate and the two chromes

Above every screen sits the gate, and its order is the point:

1. Ask the auth service who is signed in. Nothing renders until that answers – not a spinner, not a shell of a screen, because a sign-in screen that flashes past a signed-in person reads as being signed out.
2. Hand the cache its owner before any screen mounts, so a cache belonging to somebody else is gone before a single query reads it ([Data layer](./data)).
3. Show the sign-in screen, or the chrome.

After the gate the application branches once, on the tier, into the shell chrome or the browser chrome, and never asks again ([Applications](../applications)).

## Components, and what they look like

A component is a file named after it, in PascalCase, with its stylesheet and its stories beside it in a directory of its own – `Logo.tsx`, `Logo.css`, `Logo.stories.tsx`. It takes one `props` object typed as an exported `XxxProps` type declared beside it, every field `readonly` and every field documented.

What a piece looks like belongs to `libraries/ui`, not to a module. A module composes the design system's components; it does not restyle them. The design system knows what a row is and never what a participant is.

- **Styling is CSS in cascade layers** – `tokens, fonts, reset, base, component, screen` – declared in `index.html` before any stylesheet loads, so nothing depends on the order its CSS arrives in. A component imports its own stylesheet, so the CSS travels with the component.
- **No inline `style` props.** Styles live in CSS.
- **Font sizes come from the `--font-size-*` tokens**, each `calc(<N>rem / 17)` against the 17-point base the design system's base stylesheet sets, so Dynamic Type carries the reader's own text size through every role.
- **A theme is a name, not a stylesheet.** The contingent has five color identities – blue, brown, green, red, and yellow, with blue the default – and a theme is a pair of primitives, `--color-theme-bright` and the darker `--color-theme-ink`, that every rule naming the unit's colors reads. `[data-theme="<name>"]` swaps the pair rather than every rule that reads it, and the attribute is stamped before React boots, so a returning brown-unit leader does not flash blue on the way in. A color never crosses the bridge to a shell; the name does, and each shell holds its own palette.
- **Swedish is what a user reads.** The document is `lang="sv"`, and the few strings the shells own are Swedish too.

## Stories

Every component gets stories beside it as `Name.stories.tsx` ([ADR 023](/decisions/023-catalog-the-ui-in-storybook)). One Storybook serves the whole monorepo, on port 3002: it indexes `libraries/ui/src/**/*.stories.tsx` and `modules/*/src/**/*.stories.tsx`, so the design system's components and the modules' widgets and screens are browsable in one place, and the sidebar reads as the design system does – the introduction, the foundations, the components, then the modules.

Two decorators are registered once for the whole catalog rather than story by story: one gives every story the routing context the application gives its screens, so anything that links renders outside the application ([Navigation and routing](./navigation)), and one wraps it in the unit color the toolbar picked, so every story can be read in each of the five themes. Storybook itself is dressed as the guidebook is – the contingent's red, the guidebook's grays, its font stack, and the same app icon its nav bar carries – so moving between the two reads as one thing.

A story's name and its rendered output are its description, which is the one exception to the rule that every export carries a JSDoc block.
