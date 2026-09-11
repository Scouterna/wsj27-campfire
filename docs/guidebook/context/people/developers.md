# Developers

The developers build and maintain Campfire. Unlike the eight other people on the context diagram they never use the product – but they shape it all the same, so the picture is more honest with them on it.

There are two of them. That is not a detail to skip past: a two-person team is why the toolchain is strict, why the checks refuse warnings, and why so much of the working knowledge is written down instead of remembered. It is also why the work runs through agents with a human gate at every step, which is the [Process](../../process/) chapter.

## What their days look like

There is no camp in it. The developers' calendar is the contingent's calendar seen from behind, from the first CMT meeting through the trip to the handover after it, and the work moves one issue at a time: created, fixed, and released.

A working day is `pnpm install`, one of the three environments on `http://localhost:8000`, and an issue. The local environment puts the mock behind the back-end paths, the dev environment puts the real services there in containers, and the prod environment runs the built image ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)) – see [The environments](../../development/environments). Before work is handed back it runs `pnpm test` and four checks – format, lint, Markdown, and types – as separate commands on purpose, so one run reports every failure instead of stopping at the first.

## GitHub is their surface

GitHub holds the source, runs the checks, publishes what ships, and tracks the work. It is on the context diagram for that reason alone, tied to this person and to nothing else: no line runs from GitHub to Campfire, and Campfire never touches it at run time. A leader signing in on a phone at camp is not talking to GitHub.

- **The repositories.** This monorepo is `Scouterna/wsj27-campfire` ([ADR 002](/decisions/002-organize-as-a-single-monorepo)). Each back-end service lives in a repository of its own ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)).
- **The checks.** Every pull request runs small workflows that each report their own status, so a red run names what broke ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)).
- **What is published.** The deployable web image goes to the repository's own package registry on `ghcr.io` ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)), each agent skill ships as a tagged release ([ADR 025](/decisions/025-publish-agent-skills-as-versioned-releases)), and this guidebook deploys to GitHub Pages on a push to `main`.
- **The work.** Issues are typed as a feature, a bug, or a task, labeled by the components they touch, and a feature names the audience it serves from the same nine people the architecture model draws.

[Continuous integration](../../development/continuous-integration) has the whole picture, workflow by workflow.

## On the diagrams

Two lines leave the Developers on the context diagram, and neither is a line of use. One runs to Campfire and says "Build and maintain" – the eight other people follow, look up, and read, and this one writes the thing. The other runs to GitHub, and the view has to name GitHub explicitly to draw it, since nothing about it is one step from Campfire. Leaving both off would make Campfire look more self-contained than it is.

A level down the picture changes shape. On the container diagram the developers' line lands on [the mock back-end](../../testing/mock) – the only container in the model that is run rather than used, and the one that stands in for both services on a machine with no cluster behind it.

## Signing in, and what they see

They do not, as developers. There is no admin role, no developer mode, and no back door: a developer who wants to see the application signs in as somebody, either through ScoutID against a real realm or through the mock. That is deliberate – the only way to look at Campfire is the way its users look at it.
