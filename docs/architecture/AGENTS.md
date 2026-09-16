# The architecture model

Read the [root `AGENTS.md`](../../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true only of the model in this directory.

This directory holds Campfire's architecture as a [C4 model](https://c4model.com) written in [Structurizr](https://structurizr.com) DSL. One model is viewed at two levels – system context and containers – plus a deployment view per environment, and every diagram the guidebook shows is exported from it, so a picture cannot claim something the model does not say. The model describes the first version of the whole system, as the guidebook does, and it stops at the container level on purpose: what a container is made of is the code's own business, and the guidebook describes it in prose. The decision, and the four ways this model departs from a plain reading of C4, are [ADR 030](../decisions/030-model-the-architecture-as-c4-in-structurizr.md): a module and a library are containers beside the apps, the product is a container over the three things it ships as, a separately deployed service is its own software system, and there are no component views.

This file is the authoring guide: the file layout, the loop for checking and exporting, how to phrase an element and label a relationship, the palette, where new elements go, and what the check enforces.

## File layout

- **`workspace.dsl`** – the root. Declares the workspace, includes the model, the views, and the styles, sets the scope, and relaxes three inspections with their reasons beside them. Nothing else.
- **`model/`** – the elements and their relationships, one file per concern: **`people.dsl`** (the nine people, named exactly as the audience list in `.github/ISSUE_TEMPLATE/feature.yml` names them), **`external.dsl`** (ScoutID, Scoutnet, and GitHub – the systems nobody in this repository writes), **`services.dsl`** (the auth service and the participants service, each a software system of its own), **`campfire.dsl`** (the system in scope – its containers in four groups, and every relationship, flat at the bottom), and **`deployment.dsl`** (the three environments, each a tree of deployment nodes holding instances of the containers and the services).
- **`views/`** – one file per level: **`context.dsl`**, **`containers.dsl`**, and **`deployment.dsl`** (one view per environment), each view carrying the key that names its SVG.
- **`styles/styles.dsl`** – the palette and the tag styles, included inside the views block because the DSL grammar nests styles there.
- **`workspace.json`** – the compiled workspace: the model plus each view's hand-arranged layout. Written by the browser, never by hand, and the input `build:arch` renders from.
- **`diagrams/*.svg`** – the exported images, one per view, named by the view's key. They are output: never edited by hand, and never committed without the model change behind them.
- **`.structurizr/`** – what Structurizr's local server writes while it runs: a search index, logs, and view thumbnails. It is gitignored and safe to delete, and the next `pnpm start:arch` writes it again.

Everything here is reviewed like code. The `.dsl` files are the authored source; `workspace.json` carries the layout; the SVGs are what readers see. An element is written in block form – `description`, `technology`, and `tags` on their own lines inside braces – so it reads top to bottom and gains a property without counting quotes. The containers sit in `group` blocks – the apps, the modules, the libraries, and development – which render as labeled boundaries on the container diagram.

## The authoring loop

Four steps – edit, arrange, export, check – and the outputs of all four are committed together, so the model, its layout, and its images never drift apart.

1. **Edit the model** under `model/`, `views/`, or `styles/`.
2. **Arrange the layout.** `pnpm start:arch` serves Structurizr's browser UI on [http://localhost:3003](http://localhost:3003). Opening a view compiles the current DSL into `workspace.json`, keeping any layout already there, so this step is how a DSL edit reaches the export at all. The server re-parses only when `workspace.dsl` itself is newer than its last parse, never on a change to an included file, so after editing the model while the server runs, touch `workspace.dsl` and reload the page; `pnpm start:arch` touches it on every start. No view carries `autolayout` – arrange every view you changed by dragging, and the arrangement saves as you go. A new element starts unplaced. Stop the server with Ctrl+C.
3. **Export the diagrams.** `pnpm build:arch` renders every view to a self-contained SVG under `diagrams/`, from `workspace.json`. The same workspace produces byte-identical images, so re-exporting an unchanged one is a no-op.
4. **Check the model.** `pnpm check:arch` validates that the workspace parses and inspects it for the faults listed below. Silence means the model is clean.

An agent runs steps 1 and 4 and stops there: **only the browser writes a layout**, so after a DSL edit ask the maintainer to run step 2 for the affected views, then step 3. An agent never writes `workspace.json` itself, by hand or by scripting a merge – that file is the maintainer's manual work, and any agent-written version destroys it.

All three commands run the pinned Structurizr image in Docker, so **Docker must be installed and running** – the one prerequisite `pnpm install` does not provide. The image is pinned in [`scripts/structurizr/Dockerfile`](../../scripts/structurizr/Dockerfile) and wrapped by [`scripts/structurizr/run.ts`](../../scripts/structurizr/run.ts), which builds it on first use and, when Docker is missing, fails with a message that names it.

## Writing an element

- **Every element has a description**, and the check enforces it: one sentence of prose saying what the element is, readable inside the box, and never a restatement of the name. It describes the thing, not a list of its parts joined by dashes, it carries no counts that would go stale, and it is about as long as the Head of Contingent's and never longer than the Developers'.
- **Every container carries a technology** – the language and framework, not a paragraph – and the check enforces that too. A person and a software system carry none, which is why the two back-end services say `Python` nowhere: what they are written in belongs on their guidebook pages, not in a box that is deliberately opaque.
- **Describe a gap; do not invent a box.** Most of Campfire beyond the first feature is undecided, so the description says so in plain words. The box and its lines keep their category's own style, so nothing about the drawing claims more than the description does.
- **A container is a real package taken from the repository** – the web application, a shell, a module, a library, the mock – never an invented grouping. Every one of them is a directory in the repository, so the boxes are the repository's own and not a picture of an intention. The product is the single exception: Campfire as a member knows it is no package at all, and it is a container so that each audience draws one arrow rather than three, with the web application and the two shells beneath it.

## Labeling a relationship

- **A label is a short verb phrase** naming what the thing at one end does with the thing at the other – "Follow their unit and the trip", "Routes /api/auth to". About five words; read source, label, and destination together and it should still make sense.
- **A label states what a thing does**, in the present tense. What is uncertain says so in its label, starting with "May", where a reader can read it – never by a second line style, because there is only one.
- **A relationship must have a label**, and the check enforces it. An unlabeled arrow is a fact nobody wrote down.
- **A relationship is declared once, flat**, at the lowest level it is true, at the bottom of `campfire.dsl` where both ends are already in scope. A deployment relationship is the exception: it joins instances rather than the elements themselves, so it is written beside them in the environment in `deployment.dsl`.

## The palette

The application themes itself five ways, one color per unit, so the diagrams take none of those five and anchor on the contingent's official red instead. Everything outside the boundary, beside it, or never shipped gets a muted hue that places it against that red.

| Style                          | Color     | What it paints                                                          |
| ------------------------------ | --------- | ----------------------------------------------------------------------- |
| `Software System`, `Container` | `#ce4a17` | Campfire and everything inside it, the same red at both levels          |
| `product`                      | `#ce4a17` | The product as a member knows it, one box the three apps hang beneath   |
| `app`                          | `#ce4a17` | The two shells, as phones – a shippable app rather than a generic box   |
| `module`                       | `#e66b45` | A module or a library, lighter – part of Campfire, assembled by the app |
| `Person`                       | `#9a3616` | The person shape, in the darker red the app uses as that theme's ink    |
| `user`                         | `#9a3616` | The eight audiences Campfire is built for                               |
| `internal`                     | `#5a6b78` | The developers – on the context diagram, and users of none of it        |
| `service`                      | `#2f6377` | The two back-end services, adjacent to Campfire and built elsewhere     |
| `external`                     | `#667079` | ScoutID, Scoutnet, and GitHub, outside the boundary entirely            |
| `development`                  | `#7d6a4f` | What is ours and never ships, such as the mock                          |
| `Relationship`                 | `#4a5560` | Every arrow, as one solid orthogonal line. There is no second style     |

A new style takes an existing hue from this table rather than introducing a color. Relationships route **orthogonally** – straight segments joined at right angles, never diagonals – and nothing is dashed: `dashed false` is not redundant, because the renderer's own default is dashed.

## Where new elements go

- A **person** goes in `model/people.dsl`, tagged `user` when Campfire is built for them and `internal` when they build it. The participants in the list are not people here: they are data, and Campfire has no surface for them.
- A **back-end service** – ours to depend on, and nobody's here to build, because each is its own repository, image, and deployment – goes in `model/services.dsl`, tagged `service`. An **external system** nobody in this repository writes goes in `model/external.dsl`, tagged `external`.
- A **container** goes inside the `campfire` system in `model/campfire.dsl`, in the group it belongs to, with a `technology`. The product a person reaches is tagged `product`, a shell `app`, a module or a library `module`, and one that is ours and never ships `development`.
- A **deployment node** goes in the environment it belongs to in `model/deployment.dsl`, with a `technology`, holding an instance of each container or service that runs on it; the one origin of an environment is an `infrastructureNode` there, never a container of the system.
- A **new view** goes in the file for its level under `views/`, with a hand-authored key. The key names the exported file and every guidebook reference to it, so it never changes. A new level needs only a view, a committed layout, an export, and a chapter reference.

Every element appears in at least one view and connects to at least one other, or the check flags it. Four containers appear on no context or container view – the three libraries and the mock, which the container view leaves out. The mock shows up only as an instance on the local deployment view. Each of the four relaxes `structurizr.inspection.model.element.noview` on itself, with the reason beside the property. The relaxation goes on the element: a view is never padded with something that does not belong on it to quiet the check. Two systems sit one step further out than `include *` reaches and are included by name in the context view: GitHub, which relates to the developers, and Scoutnet, which relates to the participants service.

## What the check enforces

`pnpm check:arch` runs `validate` and then `inspect`, and fails, naming the fault, when the workspace does not parse, a view refers to an element the model does not define, an element has no description, a container has no technology, a relationship has no label, an element relates to nothing, or an element no view shows.

Nothing enforces that the committed SVGs match the current model – not this check, which stays out of the `pre-push` hook because it pulls a large image, and not `check_architecture.yml`, which runs `check:arch` alone on a pull request that touches the model, its runner, or that workflow. Until something does, re-export after every model change and read the diff.

Three inspections are relaxed in `workspace.dsl`, each with its reason beside the setting: **technology on relationships**, because a label here is a verb phrase and not a protocol; and **documentation and decisions on the system in scope**, because the guidebook and the decision log under `docs/` are Campfire's documentation rather than something embedded in this workspace. Those three are the workspace-wide relaxations; the only others are the four `noview` properties above, which sit on the containers they excuse rather than here.
