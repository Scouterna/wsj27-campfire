# 030. Model the architecture as C4 in Structurizr

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Two chapters of the guidebook ([ADR 028](028-keep-a-software-guidebook.md)) are diagram-shaped: Context wants the system among the people and systems around it, and Architecture wants the containers it is built from and where they run. [ADR 029](029-render-the-guidebook-with-vitepress.md) settled the small end – flows, as Mermaid in the page they illustrate – and left the architecture itself to a notation of its own.

The failure to avoid is a picture that quietly stops being true. A diagram drawn in a separate tool and pasted into a page has nothing holding it to the system, so it drifts, and a reader who trusts a stale diagram is worse off than one who had none. Campfire is unusually exposed: the back-end lives in other repositories and moves on its own cadence, and the contracts are early, so the picture will change several times in the next year. Two smaller forces shape how a diagram reaches a page: arranging one is a person's judgment that has to survive a rebuild, and the guidebook is read on the site and on GitHub, each in light and dark, so one image has to work in all four.

## Decision

We model the architecture as the [C4 model](https://c4model.com) in [Structurizr](https://structurizr.com) DSL under `docs/architecture/`, and derive every architecture diagram in the guidebook from that one model.

- **One model, viewed at two levels plus a deployment view per environment, and it stops at the container level.** There are no component views: what a container is made of is the code's own business, and the guidebook describes it in prose, where it can say what a box cannot.
- **A module is a container, and so is a library.** Each is a workspace package with its own boundary, assembled into the web application at build time ([ADR 016](016-compose-the-web-application-from-feature-modules.md)). Drawn as containers, the rule the front-end rests on is on the page: there is no arrow from one module to another.
- **A separately deployed service is its own software system.** The back-end services ship as their own images from their own repositories ([ADR 013](013-build-the-back-end-as-python-services-in-their-own-repositories.md)), so they sit on the context diagram beside the systems nobody in this project writes, and Campfire's own boundary holds what this repository builds.
- **Undecided parts are in the model, described as undecided.** A relationship that may exist says so in its label, and an element whose shape is not settled says so in its description. Every line is the same solid line, because a dashed arrow means nothing without a legend half the readers will never see.
- **Every view exports to a committed SVG** the guidebook embeds, self-contained with its own background, so one file reads on a light or a dark page in both places the guidebook is read. There is no live Structurizr site.
- **Every view is arranged by hand.** No view carries an `autolayout` line; the arrangement is made in Structurizr's browser UI and committed in `workspace.json` beside the DSL. Only the browser writes that file, so a model change is not finished until the views it touched have been arranged again.

## Consequences

- Docker is a prerequisite for changing the diagrams. Structurizr runs as a pinned image ([ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)), because the only exporter that honors a committed layout drives a headless browser.
- Generated files are committed in a repository that otherwise keeps them out, because the guidebook is read on GitHub, where a diagram that exists only after a build is a broken image.
- A committed SVG can go stale, and nothing catches it. The check on a pull request proves the model is sound, not that the images beside it were re-exported. Exporting after a model change is the author's job, and the first diagram that ships out of step with its DSL is the signal to pay for a check that compares them.
- Modules and libraries as containers make one large diagram, and the container view already leaves the libraries, the mock, and the developers out to stay readable. A fifth module is the point to ask whether it needs splitting.
- The model will be wrong about the back-end first, since that is the part known least – which is an argument for the model, because a description that changes with a line of DSL is a description that gets changed.
- Structurizr and its DSL are one more notation to learn before editing a diagram, and the price of diagrams that cannot lie.

## Alternatives considered

- **Draw the diagrams by hand and paste them in.** The most control and no dependency, and precisely the failure this decision exists to prevent: the source lives outside the repository, and nothing fails when the export goes stale.
- **Mermaid, like the flows.** Nothing new to learn, and no model underneath: each diagram is drawn independently, so the levels can disagree with each other and with the prose, and auto-layout discards any arrangement.
- **PlantUML with C4-PlantUML, or D2.** Both render C4-style diagrams well, and neither keeps one set of elements behind several views – the thing that stops the levels drifting apart.
- **A live, explorable Structurizr site.** Always current and nothing to export, and a second thing for a volunteer team to keep reachable, when the guidebook needs an image beside the prose that renders offline and diffs under review.
- **Render the diagrams in continuous integration and never commit them.** No committed image could be stale, and the guidebook read on GitHub would show a broken image – and the layouts are committed anyway.
