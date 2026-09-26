# Modules

A module is one domain capability, whole: its domain model, its data, its screens, and its widgets. Modules are how the product grows – a new capability is a new module rather than another folder inside an old one ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). They rest on shared libraries that know no feature. [Layers](./layers/) describes the shape inside a module, and [Code organization](./code-organization) the rule that keeps modules apart.

## The public surface

A module's `src/index.ts` is its whole public surface, and it stays narrow. Domain types, queries, and screens stay inside unless the application needs them, because anything reaching for a domain type is reaching past the boundary rather than through it. What leaves a module:

- **Routes** – a table of the addresses it owns and their screens, which the application merges into its own. See [Navigation and routing](./layers/navigation).
- **Widgets** – a table of widgets by id, such as `participants:unit`, for any screen to place. See [Presentation layer](./layers/presentation).
- **Doorways** – a named hook, component, or function for something the application needs, added when the application is about to use it, not before.

A fact about the signed-in person is not a doorway. It is a field on the `User` in `utils`, which any module reads ([ADR 032](/decisions/032-hold-the-signed-in-person-in-utils)).

## Authentication

The client half of the auth service. It asks who is signed in, tries one refresh on a refusal, and decodes the answer into the one `User` the application has – the name, the roles, the line that says what they are in the contingent, and the mark they wear, with the unit and how they travel read from the participants service. The session is httpOnly cookies, so the module never holds a token ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)).

It also keeps the session after boot: every read runs under it, and it tells the gate when the session ends or changes owner ([ADR 033](/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate)). It owns the sign-in screen and the profile page, which carries the way out. Signing out is shared work – the application forgets its query cache, and this module starts the round trip. [Sign in](./example-flows/sign-in) walks it.

## Home

The start screen. It decides what the screen shows, to whom, and from when, and places other modules' widgets – the countdown, a leader's unit – by id without knowing which module draws them. Until a part of the product is revealed at its moment, the screen counts down to it instead.

Its own content is the contingent's messages to the reader, addressed by role – news, important notices, and a welcome for each role saying what they can do in Campfire. The messages ship with a release rather than being fetched, and a reader can close one, which the device remembers.

## Journey

The trip: departure, the camp, and the way home. The dates are fixed and public, so they are written into the module rather than fetched, and the phase and the countdown are pure functions over them. It offers the countdown as a widget for the start screen, counting to the start of the reader's own journey: the departure of the trip they booked, which it reads from the signed-in person, or the camp itself for everyone else.

## Participants

The contingent's list of participants: the list, a person's details, the unit browser, and the unit widget on the start screen. It is the only module that reads the list from the participants service. The application tells it who is reading – a leader's unit, or everyone for the contingent management, and whether health answers are theirs to read – and the module composes the list one unit at a time within that scope. It validates every field it receives, because the service's shape will change during the build ([Data layer](./layers/data)).

The list can grow to the contingent's size, so it is virtualized ([ADR 036](/decisions/036-virtualize-a-list-that-can-grow-to-the-contingents-size)). It is also how someone chooses who to write to: the people shown, or their relatives, can be mailed or have their addresses copied, straight from the list as it is searched and narrowed. [Show participants](./example-flows/show-participants) walks a leader's view of their unit.

The units' names and marks are not in the module. They are runtime data the application loads at the gate, and every surface shows the unit's number until they arrive.

## The libraries

A library is code that would still make sense in a product that is not Campfire. It depends on no module and no other library.

- **`host`** – which tier the application runs in, a browser or a shell, and the web half of [the bridge](./layers/bridge). It depends on nothing, not even React.
- **`ui`** – the design system: components, icons, tokens, themes, the reveals, and the route and widget registries. It knows what a row is, never what a participant is.
- **`utils`** – small helpers more than one package needs, such as the `fetch` wrapper the [data layer](./layers/data) is built on, and a helper joins only when a second package already wants it. It also holds the session every module may read – the roles and the signed-in person. That is the one exception to the portability test, kept to the session's vocabulary ([ADR 032](/decisions/032-hold-the-signed-in-person-in-utils)).
