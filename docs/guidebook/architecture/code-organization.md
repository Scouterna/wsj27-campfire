# Code organization

The repository is one monorepo holding the web application, the two shells, and everything they share ([ADR 002](/decisions/002-organize-as-a-single-monorepo)). The code in it is divided four ways, and where a piece goes follows from what it is allowed to know.

| Directory    | Holds                                          | Knows                               |
| ------------ | ---------------------------------------------- | ----------------------------------- |
| `apps/`      | The web application and the two shells         | Everything – they assemble the rest |
| `modules/`   | Feature modules, one domain capability each    | Its own domain, and the libraries   |
| `libraries/` | Generic, reusable code                         | Nothing about any feature or app    |
| `tools/`     | Development tooling, such as the mock back-end | Nothing that ships                  |

The shells are Gradle and Xcode projects with no feature code, driven by the root scripts and described on [Applications](./applications). The rest of this page is the TypeScript half. Where everything sits on disk is [Repository layout](../development/layout).

## The dependency rule

**No module imports another module** ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). A module depends only on the libraries, a library depends on no module and no other library, and only the web application depends on the modules. Every dependency points from an app to a module or a library, or from a module to a library.

The rule is held by the tools rather than by review. A package that is not a declared dependency does not resolve for TypeScript, so importing a module by name fails the type check, and the linter refuses a relative path into another package, which is the one form that would otherwise slip past.

A library that knows a feature is a feature module in the wrong place, and a module that needs another module's knowledge is a seam that should have been a library. A fact two modules both need lives in a library both may import: the authentication module fills in the signed-in person, the application hands it to `utils`, and the journey module reads it from there without learning that authentication exists ([ADR 032](/decisions/032-hold-the-signed-in-person-in-utils)).

## Raw source, one build

Every package is a private pnpm workspace package named `@scouterna/wsj27-campfire-<name>`, and its version is a placeholder, because each artifact takes its version from its own commits ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)). No module or library is built on its own: each exports its TypeScript source, and Vite compiles the whole graph into the web application.

That removes build order, stale output, and per-package watch modes, and leaves one set of compiler settings deciding what the types are. The cost is that a package can only be consumed by a bundler that reads TypeScript, which the web application is.

## The composition root

The web application is the one place that knows every module, and that is what lets no module know another. It merges each module's route table and widget table into its own and hands them to the router and the widget provider. A module reaches the application by registration, never by being reached into, and the application only joins – it computes nothing on a module's behalf.

Two registries in `libraries/ui` make that safe at compile time:

- **`RouteRegistry`** – each module declares the addresses it owns, branded with its name, so two modules claiming one address is a type error rather than a race the later import wins. See [Navigation and routing](./layers/navigation).
- **`WidgetRegistry`** – each module declares its widgets by id, and a screen places another module's widget by that id without importing it. An id nothing registered renders nothing, which is the right behavior for a build assembled without that module. See [Presentation layer](./layers/presentation).
