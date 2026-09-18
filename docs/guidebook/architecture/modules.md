# Modules

A module is one domain capability, whole: its domain model, its data layer, its screens, and its widgets. Four exist – `authentication`, `home`, `journey`, and `participants` – and they are how the product grows. A new capability is a new module, not another folder inside an old one ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). [Layers](./layers/) describes the shape each one takes inside.

They rest on three libraries in `libraries/`, generic code that knows no feature: `host` reads which tier the application runs in and owns the bridge to the shells, `ui` holds the design system and the two registries, and `utils` holds the small pure helpers. [The libraries](#the-libraries) at the bottom of this page says what each one holds. [Code organization](./code-organization) has the dependency table; [Applications](./applications) has the application that composes them.

## The public surface

`src/index.ts` is a module's whole public surface, and it is a deliberate, narrow list. Domain types, queries, and screens stay internal unless the application genuinely needs them – anything reaching for a domain type is reaching past the boundary rather than through it.

Three kinds of thing leave a module:

- **Routes.** The module augments `RouteRegistry` with each address it owns, branded with its own name, and exports a table of address to screen that the application spreads into its own. The brand makes two modules claiming one path a compile error. See [Navigation and routing](./layers/navigation).
- **Widgets.** The module augments `WidgetRegistry` in the widget's own file and exports a widget table. Ids read `module:widget` – `participants:unit`. See [Presentation layer](./layers/presentation).
- **Doorways.** A named hook or component for a fact another part of the product needs, such as which theme the signed-in person wears. A fact about the person themselves is a field on `User`, read with `utils`' `useUser`. A doorway is a promise, so one is added when the application is about to walk through it, not before.

Registration, not import, is how a module reaches the application, and that is what lets a module stay ignorant of its neighbors.

## Authentication

`modules/authentication` is the client half of the auth service's browser contract: the sign-in and sign-out addresses, the question of who is signed in and its one refresh retry, the defensive decode of the user payload – the flattened roles translated into the closed set `utils` declares – and the signed-in person: one `User`, the application's only definition of who is signed in, filled in whole here – the greeting name, the unit the roles or the list of participants place them in, how they travel, the line that says what they are, and the mark they wear. The type itself is `utils`', beside `useUser`, so any module can read who is signed in without importing this one.

It holds no token and never will. The session is httpOnly cookies the browser carries, so the module asks who is signed in and is told, or is not ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). [Sign in](./example-flows/sign-in) walks the whole round trip.

It exports `SignInScreen`, the screen the session gate shows when nobody is signed in, and a route table holding the profile page at `/profile` – the page the chrome's profile control opens. The page shows the signed-in person as the `User` knows them – the mark, the name, and the role line under it, with the unit held back until the units reveal exactly as the chrome holds it – and carries the one way out. It fetches nothing.

Signing out is two packages' work: the application forgets its query cache, and this module starts the round trip. A routed screen takes no props, so the module also exports `SignOutProvider`, which the gate mounts with the whole of it, and the page presses whatever the provider holds.

## Home

`modules/home` is the smallest module, and deliberately so. It owns the start screen's layout, the contingent's messages, and the emergency numbers a leader needs, and it fetches nothing.

A message is a title and a text the contingent has for the people who open Campfire, addressed by role and starting with a welcome for each – what a leader can do with their unit, and what the management can do with everyone. The messages are a list in the module's own model, shipped with a release rather than fetched. Once the units reveal has opened, the start screen shows the ones for the reader's roles that this device has not closed over every other widget, together on one plate in the theme's bright color and under one close control, and remembers the closed ones in the device's storage – which it never trusts, so a value it cannot read shows a message again rather than breaking the screen.

The countdown and the unit widgets on that screen are other modules', mounted by id through the widget registry, and who sees which – and from when – is the screen's own decision, read from the reveal and the ambient roles. That is the rule doing its job: home shows a countdown and a unit's people without knowing that the journey or participants modules exist.

## Journey

`modules/journey` is the trip itself: departure, the camp, and the way home. The dates are fixed and public, so they are written down rather than fetched, and the phase and the countdown are pure functions over them – there is nothing to load and nothing to cache.

Its public surface is one countdown widget, registered by id and placed by the start screen itself.

## Participants

`modules/participants` is the contingent's list of participants, and the largest module by far: the list and the detail screens, the unit browser, the widgets other screens place, and the query factories and DTO converters behind them. The units' names and marks are deliberately not here: they are runtime data the application fetches at its gate, kept out of the repository until the reveal, and every surface falls back to the unit's number while they are unloaded.

It is the only module that talks to the participants service, and one of the two with a data layer, beside authentication. Every field arrives typed `unknown` and is validated at the boundary, because the service will change shape over an eighteen-month build ([Data layer](./layers/data)). It also holds the first feature: a leader seeing the participants in their unit, walked through on [Show participants](./example-flows/show-participants).

The list is also how somebody chooses who to write to. Its overflow menu mails the people it shows, or copies their addresses, and does the same for their relatives – acting on the list as it is searched and narrowed, from the addresses the listing already carries, so nobody is fetched to be written to. A mail opens with every address as a hidden copy, and a recipient list too long for a mail link is one to copy instead.

The fetch behind those queries comes from `libraries/utils`.

## The libraries

A library that knows a feature is a feature module in the wrong place. The test is portability: a package that would still make sense in a product that is not Campfire belongs in `libraries/`.

- **`host`** answers which tier the application is running in, a browser or a shell's webview, and carries the versioned bridge to the shells. It has no dependencies at all, not even React, because everything it does is message passing and JSON.
- **`ui`** is the design system: components, icons, tokens, the five themes, the route and widget registries, and the behavior helpers. It knows what a row is; it does not know what a participant is.
- **`utils`** holds the small pure helpers more than one package needs, and the bar for adding one is that a second package already wants it. `stringOrFallback` reads a string out of untyped input, and the `fetch` wrapper the [data layer](./layers/data) is built around tells a request that never reached anything, a refusal carrying its status, and an answer that was not JSON apart. It also holds the session's role vocabulary – the closed `Role` set and the `hasAnyRole`, `hasAllRoles`, and `leaderUnit` helpers – with the `RolesProvider` the application mounts at the session gate, so any module reads `useRoles()` instead of having answers threaded down as props. The signed-in person is here the same way: the `User` type, with its unit, travel choice, role line, and mark, and the `UserProvider` that lets any module read `useUser()`. The translation from the provider's spellings into that set is not here: it is the authentication module's, in its data layer.

Libraries do not import modules, and they do not import each other.
