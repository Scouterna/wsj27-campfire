# Code organization

The repository is one monorepo holding the web application, the two native shells, and everything they share ([ADR 002](/decisions/002-organize-as-a-single-monorepo)). The code in it is divided four ways, and where a piece goes follows from what it is allowed to know.

| Directory    | Holds                                                        | Knows                                |
| ------------ | ------------------------------------------------------------ | ------------------------------------ |
| `apps/`      | The deployable apps – the web application and the two shells | Everything: they assemble the rest   |
| `modules/`   | Feature modules – one domain capability each                 | Its own domain, and the libraries    |
| `libraries/` | Generic, reusable code                                       | Nothing about any feature or any app |
| `tools/`     | Development tooling – the mock back-end                      | Nothing that ships                   |

A library that knows a feature is a feature module in the wrong place, and a module that knows another module is a seam that should have been a library. The second half of that is a hard rule rather than an aspiration: **no module imports another module**, and the compiler is the only thing keeping it true, because nothing else could ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)).

`apps/android` and `apps/apple` sit outside the rest of this page. They are Gradle and Xcode projects with no `package.json`, driven by the root scripts, and they hold no feature code by design – [Applications](./applications) says what they do hold. Everything below is the TypeScript half.

Where all of it sits on disk, and what each directory outside these four is for, is [Repository layout](../development/layout).

## The packages

`apps/*`, `libraries/*`, `modules/*`, and `tools/*` are the four pnpm workspace roots. Every package is private, is `"type": "module"`, is named `@scouterna/wsj27-campfire-<name>`, and carries the placeholder version `0.0.0`, because a version lives in a release tag rather than in the tree ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)).

| Package                  | Name                                       | Depends on                                                   |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| `apps/web`               | `@scouterna/wsj27-campfire-web`            | authentication, home, journey, participants, host, ui, utils |
| `modules/authentication` | `@scouterna/wsj27-campfire-authentication` | ui, utils                                                    |
| `modules/home`           | `@scouterna/wsj27-campfire-home`           | ui                                                           |
| `modules/journey`        | `@scouterna/wsj27-campfire-journey`        | ui                                                           |
| `modules/participants`   | `@scouterna/wsj27-campfire-participants`   | ui, utils                                                    |
| `libraries/host`         | `@scouterna/wsj27-campfire-host`           | nothing at all – not even React                              |
| `libraries/ui`           | `@scouterna/wsj27-campfire-ui`             | React, and nothing in the workspace                          |
| `libraries/utils`        | `@scouterna/wsj27-campfire-utils`          | React, and nothing in the workspace                          |
| `tools/mock`             | `@scouterna/wsj27-campfire-mock`           | Hono, and nothing in the workspace                           |

That table is the rule made concrete. Every arrow points from an app to a module or a library, or from a module to a library, and there is no arrow between two modules or between two libraries.

## Raw source, one build

No module and no library is built. Each exports its own TypeScript – `"exports": { ".": "./src/index.ts" }` – and Vite compiles the whole graph together into `apps/web/.build`.

That removes a class of problem rather than solving it: no build order, no stale `dist/`, no watch mode per package, and one set of compiler settings deciding what the types are. The cost is that a package is only consumable by a bundler that reads TypeScript, which is fine, because the only consumer is the web application.

`libraries/ui` carries one second export condition, `./styles.css`, because what that file holds is global – the tokens, the faces, the reset, and the base. A component's own stylesheet is not global, so it sits beside the component and arrives when the component is imported.

## What the model draws

The C4 model draws this division literally. Each app, each feature module, and each library is a container of the Campfire system rather than a component inside one front-end box ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)) – which is what they are: separately bounded packages, assembled by the web application at build time.

Hiding them inside one container would hide the rule the whole front-end rests on, and it would leave the two edges that matter most – authentication to the auth service, participants to the participants service – belonging to nobody in particular.

## The composition root

One file knows every module exists, and that is what lets no module know another. It merges each module's route table into one `screens` object and each module's widgets into one `widgets` object, and hands both to the router and to the widget provider.

Modules do not import each other, so anything one module knows and another needs lives in a library both may import. The authentication module decodes the signed-in `User` – how they travel included – the application hands it to `utils`' `UserProvider` once, and the journey's countdown reads it with `useUser`. The application passes nothing along and works nothing out, and journey never learns that authentication exists.

Two registries make that safe at compile time, and both live in `libraries/ui`:

- **`RouteRegistry`** is an empty interface each module augments with the addresses it owns, branded with its owner, so two modules claiming `/participants` is a type error rather than a race the later import wins. See [Navigation and routing](./layers/navigation).
- **`WidgetRegistry`** works the same way for widgets. A screen draws another module's contribution with `<Widget id="participants:unit" />`, and an unregistered id renders nothing – the honest behavior for a build assembled without that module. See [Presentation layer](./layers/presentation).

Registration, not import, is how a module reaches the application. The application spreads the tables; it never reaches inside a module.
