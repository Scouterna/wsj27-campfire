# Layers

Every module is built in the same three layers, and a dependency may only point inward ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)).

| Layer            | Holds                                       | Knows                            |
| ---------------- | ------------------------------------------- | -------------------------------- |
| **Domain**       | Models and the pure functions over them     | Nothing – not even the platform  |
| **Data**         | Query factories and the DTOs they validate  | The domain it implements against |
| **Presentation** | Screens, widgets, and the hooks behind them | The domain                       |

The domain sits in the middle and depends on neither side. Presentation reads it; data produces it. Nothing in the domain imports React, `fetch`, or a TanStack package, so the rules the product actually has can be read and tested without a browser.

A module with all three layers takes the shape below, and the participants module is the one it was drawn from.

```text
modules/<name>/src/
├── data/
│   ├── dto/          the wire shapes, every field typed unknown, and their converters
│   └── fetch-*.ts    one query-option factory per endpoint
├── model/            the domain types and their pure functions
├── ui/
│   ├── screens/      one directory per screen
│   ├── widgets/      one directory per widget other modules' screens place
│   └── storybook/    the decorators and fixtures the module's own stories need
└── index.ts          the public surface – everything else is internal
```

Not every module needs all three. Journey has a model and no data layer, because the trip's dates are fixed and public and are written down rather than fetched. Home is the same shape, smaller: a one-file model holding the contingent's messages, and no data layer, because it places what other modules provide and fetches nothing. A module missing a layer is a legitimate shape, not a shortcut around the rule – the directory arrives when there is something to put in it.

Until a module has more than one screen, the screen sits directly in `src/` beside `index.ts`.

## How a piece gets what it needs

There is no dependency container and no injection framework. A module is a set of components and hooks, and what they need reaches them three ways:

- **Through props**, inside a module. A screen hands its own components what they draw, the way the countdown widget hands its card the moment. Nothing crosses a module boundary as a prop: the application composes, and computes nothing on a module's behalf.
- **Through context**, mounted once above the screens. The signed-in `User` and their roles, the theme, the unit identities, the merged widget table, and who is reading the list of participants are each stated once at the session gate and read wherever they are needed, so a test or a story can replace one by mounting a different provider. This is how a fact one module resolved reaches another: the authentication module decodes the `User`, `utils` holds it, and the journey's countdown reads how the person travels with `useUser`.
- **Through registration**, for routes and widgets. A module declares the addresses and the widget ids it owns into interfaces in `libraries/ui`, and the application collects the tables. The library never learns which modules exist, and two modules claiming one address or one id still collide at compile time. A screen places another module's widget by id, and decides for itself who sees it.

A hook is the unit that gets tested and reused, not a class. A screen calls one hook, gets the state it renders, and decides nothing about where the state came from.

## What cuts across

Navigation sits in no single layer, so it has [a page of its own](./navigation). [Example flows](../example-flows/) follow the whole stack working together.

| Page                                   | What it covers                                                    |
| -------------------------------------- | ----------------------------------------------------------------- |
| [Domain layer](./domain)               | The domain types, valid by construction, and their pure functions |
| [Data layer](./data)                   | The query factories, the DTOs, and the boundary they guard        |
| [Presentation layer](./presentation)   | Screens, widgets, hooks, and the stories that catalog them        |
| [Navigation and routing](./navigation) | The routes, the addresses, and what owns the navigation state     |
