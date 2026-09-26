# WSJ27 Campfire

Campfire is a digital companion for **Scouterna's Swedish contingent to the World Scout Jamboree 2027 (WSJ27)** in Gdansk, Poland. Its users are the people running the contingent – the unit leaders and the contingent management team (CMT). Leaders see the participants in their units, and the contingent's day-to-day conversation happens on Discord.

This repository holds the front-end: one React web application, and the two thin native shells – Android in Kotlin, Apple in Swift – that host it on a phone. The back-end services are Python, in repositories of their own.

![System context diagram: Campfire at the center, used by the leaders, the contingent management team roles, and the developers; the auth service and the participants service behind it; and ScoutID, Scoutnet, and GitHub around them.](docs/architecture/diagrams/systemContext.svg)

## Start with the guidebook

Campfire is built on decisions made explicitly and written down. The **software guidebook** is published at **[scouterna.github.io/wsj27-campfire](https://scouterna.github.io/wsj27-campfire/)** and runs locally beside the code:

```sh
pnpm install          # dependencies and the git hooks – the only setup step
pnpm start:guidebook  # the guidebook at http://localhost:3001
```

- **[The software guidebook](docs/guidebook/index.md)** – how the system is designed: its context, requirements, architecture, process, and testing.
- **[The decision records](docs/decisions/index.md)** – every significant decision with its context and trade-offs. What an accepted record decided changes only through a new record.
- **[The architecture model](docs/architecture/AGENTS.md)** – the C4 model every diagram in the guidebook is rendered from. Working on it needs Docker.

## Building and running

Node.js LTS and pnpm build the web application and the tooling. The shells need Xcode and the Android SDK, the local environment needs Caddy, and the container environments need Docker – [Setting up](docs/guidebook/development/setup.md) has the full list.

```sh
pnpm start:local      # the whole app on http://localhost:8000, with the mock back-end
pnpm start:storybook  # every component, widget, and screen, on port 3002
pnpm start:apple      # the Apple shell on a Simulator
pnpm start:android    # the Android shell on an emulator
```

[The scripts](docs/guidebook/development/scripts.md) lists every script, and [the checks](docs/guidebook/development/checks.md) says what a change passes before it leaves the machine.

## How work happens

Most of the work is done by AI agents – an analyst, an architect, a developer, and a reviewer – each with one job, and a human deciding at every handoff ([Process](docs/guidebook/process/index.md)). [`AGENTS.md`](AGENTS.md) is where every agent starts, and it routes to the guide beside each area of the code.

Work is tracked as GitHub issues and merged by rebasing. [`CONTRIBUTING.md`](.github/CONTRIBUTING.md) says how to take part.

## License

MIT – see [`LICENSE.md`](LICENSE.md).
