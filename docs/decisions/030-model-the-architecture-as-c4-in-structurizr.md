# 030. Model the architecture as C4 in Structurizr

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The guidebook's Context and Architecture chapters ([ADR 028](028-keep-a-software-guidebook.md)) are diagram-shaped – the system among the people and systems around it, and the containers it is built from and where they run. [ADR 029](029-render-the-guidebook-with-vitepress.md) drew the flows in Mermaid and left the architecture to a notation of its own.

The failure to avoid is a picture that quietly stops being true, because a reader who trusts a stale diagram is worse off than one with none. The back-end lives in other repositories and moves on its own cadence, so the picture changes often. Arranging a diagram is a person's judgment that has to survive a rebuild, and the guidebook is read on the site and on GitHub, in light and dark, so one image has to work in all four.

## Decision

We model the architecture as the [C4 model](https://c4model.com) in [Structurizr](https://structurizr.com) DSL under `docs/architecture/`, and derive every architecture diagram in the guidebook from that one model.

- **One model, viewed as a system context, containers, and a deployment view per environment.** There are no component views, because what a container is made of is the code's business, and the guidebook describes it in prose.
- **A module is a container, and so is a library** – each a workspace package with its own boundary ([ADR 016](016-compose-the-web-application-from-feature-modules.md)) – so the absence of an arrow between modules is on the page.
- **Each back-end service is its own software system**, built outside this repository ([ADR 013](013-keep-the-back-end-services-in-their-own-repositories.md)) and answering its own API. How a service's repository builds and deploys it is that repository's business.
- **Undecided parts are in the model, described as undecided**, in a label or a description.
- **Every view exports to a committed SVG** with its own background, so one file reads on light and dark pages alike. There is no live Structurizr site.
- **Every view is arranged by hand** in Structurizr's browser UI, and the layout is committed in `workspace.json`, which only the browser writes.

## Consequences

- Changing a diagram needs Docker, because Structurizr runs as a pinned image ([ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)) and the only exporter that honors a committed layout drives a headless browser.
- Generated files are committed, because on GitHub a diagram that exists only after a build is a broken image.
- A committed SVG can go stale unnoticed, since the check proves the model is sound, not that the images were re-exported.
- Modules and libraries as containers make one large diagram, which the container view keeps readable by leaving some out.
- Structurizr's DSL is one more notation to learn before editing a diagram.

## Alternatives considered

- Hand-drawn diagrams – the source lives elsewhere, and nothing fails when an export goes stale.
- Mermaid – no model underneath, so the levels can disagree, and auto-layout discards any arrangement.
