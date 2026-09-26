# Layers

Every module is built in up to three layers of a simplified Clean Architecture, and a dependency only points inward ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). The use cases, repositories, and dependency container of a fuller Clean Architecture are left out: a screen calls a hook, the hook reads a query the data layer builds, and that chain does the same work with less machinery.

| Layer                          | Holds                                                   | Depends on              |
| ------------------------------ | ------------------------------------------------------- | ----------------------- |
| [Domain](./domain)             | Models and the pure functions over them                 | Nothing                 |
| [Data](./data)                 | Query factories, and the DTOs and converters they read  | The domain              |
| [Presentation](./presentation) | Screens, widgets, and the hooks that read the factories | The domain and the data |

The domain sits in the middle and depends on neither side. Data produces domain values from what the services send, and presentation reads them. Nothing in the domain imports React, the network, or a TanStack package, so the rules the product actually has can be read and tested without a browser. Presentation reaches into data only through the query factories, and never sees a wire shape.

A module with all three layers takes this shape, drawn from the participants module:

```text
modules/<name>/src/
├── data/
│   ├── dto/          the wire shapes, every field typed unknown, and their converters
│   └── fetch-*.ts    one query factory per read
├── model/            the domain types and their pure functions
├── ui/
│   ├── screens/      one directory per screen, its hooks beside it
│   ├── widgets/      what other modules' screens place by id
│   └── storybook/    the decorators and fixtures the module's own stories need
├── routes.tsx        the addresses the module answers at
├── widgets.ts        the widgets it provides
└── index.ts          the public surface – everything else is internal
```

A module has only the layers it needs, and a missing one is a legitimate shape rather than a shortcut around the rule. Journey and home have a model and a presentation layer but no data layer, because what they show – the trip's dates and the contingent's messages – is written down rather than fetched. Until a module has more than one screen, the screen may sit directly in `src/` beside `index.ts`.

## How a piece gets what it needs

There is no injection framework. A module is a set of components and hooks, and what they need reaches them one of three ways:

- **Props**, inside a module. A screen hands its own components what they draw. Nothing crosses a module boundary as a prop, because the application composes and computes nothing on a module's behalf ([ADR 032](/decisions/032-hold-the-signed-in-person-in-utils)).
- **Context**, mounted once at the session gate – the signed-in `User` and their roles, the theme, the unit identities, the reveals, the widget table, and who is reading the list of participants. This is how a fact one module settles reaches another: the authentication module fills in the `User`, `libraries/utils` holds it, and the journey's countdown reads how the person travels with `useUser`. A test or a story replaces any of them by mounting another provider.
- **Registration**, for routes and widgets. A module declares the addresses and widget ids it owns into interfaces in `libraries/ui`, and the application merges the tables. The library never learns which modules exist, and two modules claiming one address still collide at compile time.

A hook is the unit that gets reused and tested, not a class. A screen calls one, gets the state it renders, and knows nothing about where that state came from.

## Across the layers

Two concerns belong to no single layer. [Navigation and routing](./navigation) covers the addresses, the sections, and back, and [The bridge](./bridge) covers the contract with the native shells. [Example flows](../example-flows/) follow a request through the whole stack.
