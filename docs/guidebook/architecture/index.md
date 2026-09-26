# Architecture

This chapter describes how Campfire is put together. The people and systems around it are in [Context](../context/); this chapter starts at that boundary and works inward, from the applications to the modules to the layers inside one.

| Page                                     | What it covers                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [Code organization](./code-organization) | How the code is divided, and the rule that keeps modules apart            |
| [Applications](./applications)           | The web application, the two shells that host it, and the one origin      |
| [Modules](./modules)                     | What each feature module and library owns                                 |
| [Layers](./layers/)                      | Domain, data, and presentation, and the navigation and bridge across them |
| [Example flows](./example-flows/)        | Signing in, and a leader's unit – the layers working together             |

## Containers

Campfire is one web application, used in a browser and hosted on a phone by an Apple shell and an Android shell. The application is composed from feature modules, and the modules talk to back-end services that live outside the boundary. [Applications](./applications) describes the three apps and how the shells host the web, [Modules](./modules) what each module owns, and [Environments](../development/environments) where each of them runs and what answers behind the one origin they share.

![Container diagram. Leaders and each function of the contingent management team reach the Campfire app, which ships as the web app in a browser and as the Apple and Android shells. Each shell hosts the web app in one webview per tab and opens ScoutID sign-in in a modal. The web app works through the authentication, home, journey, and participants modules. The authentication module signs in with the auth service over /api/auth and reads the member's unit and travel from the participants service over /api/project; the participants module reads the list of participants from the same service. The auth service runs the OpenID round trip with ScoutID.](../../architecture/diagrams/containers.svg)

The diagram leaves out two kinds of container the model holds. The libraries are reached by nearly every other container, so drawing them adds a fan of arrows and no fact about the product's shape. The [mock back-end](../testing/mock) stands in for both services on a developer's machine, but it is a developer tool and never a dependency of anything shipped.

## What the model draws

Every diagram is rendered from one C4 model written in Structurizr DSL, so the diagrams cannot disagree with each other ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)). The model has a system context view, a container view, and a deployment view per environment.

Each app, module, and library is a container of its own rather than a component inside one front-end box. That is what they are – separately bounded packages the web application assembles at build time – and drawing them that way keeps the module rule visible, along with each module's edge to the service it talks to. The back-end services are drawn as software systems of their own, because they are built and run outside this repository.

The model stops at containers. What a container is made of is described in prose under [Layers](./layers/) and checked against the code rather than against a picture. The data model is not written down either: the wire shapes belong to the services, and the domain shapes to the module that reads them, so a third copy here would only go stale.
