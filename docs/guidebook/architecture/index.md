# Architecture

This chapter describes how Campfire is put together. The system in its surroundings – the people and the systems it depends on – is the [Context](../context/) chapter; this one starts at the boundary and works inward.

Every diagram here is rendered from one C4 model written in Structurizr DSL, so the levels cannot silently disagree with each other or with this text ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)). The model is viewed at two levels, system context and containers, plus a deployment view per environment, and it describes the whole system. What a container is made of is described in prose on the pages below rather than drawn.

| Page                                     | What it covers                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| [Code organization](./code-organization) | How the code is divided – the application, the modules, the libraries, the shells |
| [Applications](./applications)           | The web application, the two shells, and the services behind them                 |
| [Modules](./modules)                     | The feature modules and what each is built from inside                            |
| [Layers](./layers/)                      | Domain, data, and presentation – and the navigation that cuts across them         |
| [Example flows](./example-flows/)        | Sign in, and a leader's unit – the layers seen working together                   |

## Containers

Campfire is one web application, hosted on a phone by an Apple shell and an Android shell. Where each of them runs, and what stands behind the one origin they all use, is the deployment story on [The environments](../development/environments). [Applications](./applications) describes the three and the shell pattern; [Modules](./modules) describes the feature modules the application is composed from.

![Container diagram, rendered from the model. Inside the Campfire boundary, the apps group holds the Campfire app as a member knows it, which ships as the React web application in a browser and as the Android and Apple shells, and the modules group holds the authentication, home, journey, and participants modules. The leaders and the contingent management team's seven functions each reach the Campfire app with one arrow. Each shell hosts the web application in one webview per tab and opens ScoutID sign-in on top of that. The web application signs the member in through the authentication module, and shows the start screen, the trip, and the register through the home, journey, and participants modules. The authentication module signs in over /api/auth with the auth service, the participants module reads the register over /api/project from the participants service, and both services sit outside the boundary. Every relationship is drawn as a solid line.](../../architecture/diagrams/containers.svg)

The mock never ships – it runs on a developer's machine, standing in for both services so the application can be run and tested against a known state ([The mock back-end](../testing/mock)).

Four containers the model holds are deliberately absent from that picture. The `host`, `ui`, and `utils` libraries are left off because every module reaches all three, so drawing them adds a fan of arrows and no fact about the product's shape; the mock is left off because the diagram shows what the contingent's application depends on, and the mock is a developer tool rather than a runtime dependency of anything shipped.

## What the model does not draw

The model stops at the container level on purpose. What a container is made of is the code's own business, so there are no component views: the [layers](./layers/) inside a module are prose here, checked against the source rather than against a picture.

The data model is not written down either. The wire shapes belong to the participants service, whose own repository decides what the register publishes, and the domain shapes belong to the module that reads them. A third copy here would be a copy that goes stale.
