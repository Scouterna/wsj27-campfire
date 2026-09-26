# The architecture model

Read the [root `AGENTS.md`](../../AGENTS.md) first. This file is what is true only of the C4 model in this directory, written in [Structurizr](https://structurizr.com) DSL ([ADR 030](../decisions/030-model-the-architecture-as-c4-in-structurizr.md)).

One model is viewed as a system context, a container view, and a deployment view per environment, and every diagram in the guidebook is exported from it, so a picture cannot claim what the model does not say. It describes the whole system as designed, as the guidebook does, and stops at containers on purpose – what a container is made of is the code's business. ADR 030 records where it departs from plain C4: a module and a library are containers beside the apps, the product is a container over the three things it ships as, each back-end service is its own software system, and there are no component views.

## Layout

- **`workspace.dsl`** – the root. It includes the model, the views, and the styles, sets the scope, and relaxes three inspections with their reasons beside them.
- **`model/`** – one file per concern: `people.dsl`, `external.dsl` for systems nobody here writes, `services.dsl` for the back-end services, `campfire.dsl` for the system in scope and every relationship, and `deployment.dsl` for the environments.
- **`views/`** – one file per level, each view carrying the key that names its SVG.
- **`styles/styles.dsl`** – the palette, included inside the views block because the grammar nests styles there.
- **`workspace.json`** – the compiled workspace with each view's hand-arranged layout, written only by the browser.
- **`diagrams/*.svg`** – the exported images, one per view. They are output, never edited by hand.
- **`.structurizr/`** – what the local server writes while it runs. Gitignored and safe to delete.

An element is written in block form – `description`, `technology`, and `tags` on their own lines inside braces. The containers sit in `group` blocks, which render as labeled boundaries.

## The authoring loop

The model, its layout, and its images are committed together, so they never drift apart.

1. **Edit** the DSL under `model/`, `views/`, or `styles/`.
2. **Arrange.** `pnpm start:arch` serves Structurizr on port 3003. Opening a view compiles the DSL into `workspace.json`, keeping the layout already there. The server re-parses only when `workspace.dsl` itself is newer, so after editing an included file, touch `workspace.dsl` and reload. No view uses `autolayout` – drag every view you changed; a new element starts unplaced.
3. **Export.** `pnpm build:arch` renders every view to an SVG from `workspace.json`. An unchanged workspace exports byte-identical images.
4. **Check.** `pnpm check:arch` validates and inspects the workspace. Silence means clean.

An agent runs steps 1 and 4 and stops, then asks the maintainer to run steps 2 and 3 for the views it names. All three commands run a pinned Structurizr image, so **Docker must be running**; the image is pinned in [`scripts/structurizr/Dockerfile`](../../scripts/structurizr/Dockerfile).

## Writing an element

- **Every element has a description**, and the check enforces it – one sentence saying what the element is, never the name restated, never a list of its parts, and never a count. It is one short sentence, about as long as its siblings – roughly six to twelve words.
- **Every container carries a technology** – the language and framework, not a paragraph. A person and a software system carry none, so the back-end services say `Python` nowhere; that belongs on their guidebook pages.
- **Describe a gap; do not invent a box.** Where an element is undecided, its description says so in plain words, and the drawing claims nothing more.
- **A container is a real package in the repository**, never an invented grouping. The product is the single exception: a container over the web application and the two shells, so each audience draws one arrow rather than three.

## Labeling a relationship

- **A label is a short verb phrase** – "Know and reach their unit", "Routes /api/auth to" – about five words, readable as source, label, and destination together.
- **It states what a thing does, in the present tense.** What is uncertain starts with "May", because there is only one line style to carry it.
- **Every relationship has a label**, and the check enforces it.
- **A relationship is declared once**, at the lowest level it is true, flat at the bottom of `campfire.dsl`. A deployment relationship joins instances, so it is written beside them in `deployment.dsl`.

## The palette

The diagrams take their colors from the contingent's palette. Campfire and everything inside it is red, and everything outside, beside, or never shipped takes a muted hue against it.

| Style                          | Color     | What it paints                                                     |
| ------------------------------ | --------- | ------------------------------------------------------------------ |
| `Software System`, `Container` | `#ce4a17` | Campfire and everything inside it                                  |
| `product`                      | `#ce4a17` | The product, the one box the apps hang beneath                     |
| `app`                          | `#ce4a17` | A shell, drawn as a phone                                          |
| `module`                       | `#e66b45` | A module or a library – part of Campfire, assembled by the app     |
| `Person`                       | `#9a3616` | The person shape, in the palette's darker red                      |
| `user`                         | `#9a3616` | An audience Campfire is built for                                  |
| `internal`                     | `#5a6b78` | The developers, who use none of it                                 |
| `service`                      | `#2f6377` | A back-end service, adjacent to Campfire and built elsewhere       |
| `external`                     | `#667079` | A system outside the boundary entirely                             |
| `development`                  | `#7d6a4f` | What is ours and never ships, such as the mock                     |
| `Relationship`                 | `#4a5560` | Every arrow, as one solid orthogonal line – there is no second one |

A new style takes a hue from this table rather than a new color. Relationships route orthogonally, and `dashed false` is not redundant, because the renderer's default is dashed.

## Where new elements go

- A **person** goes in `model/people.dsl`, named as the audience list in `.github/ISSUE_TEMPLATE/feature.yml` names them, tagged `user` or `internal`. The participants in the list are data, not people here.
- A **back-end service** goes in `model/services.dsl`, tagged `service` – one software system per service, however its repository builds and deploys it, because that is the repository's business. It goes in once something in the model relates to it. An **external system** goes in `model/external.dsl`, tagged `external`.
- A **container** goes inside the `campfire` system in `model/campfire.dsl`, in its group, with a `technology`, tagged `product`, `app`, `module`, or `development`.
- A **deployment node** goes in its environment in `model/deployment.dsl`, with a `technology`. An environment's one origin is an `infrastructureNode`, never a container.
- A **new view** goes in its level's file under `views/`, with a hand-authored key. The key names the exported file and every guidebook reference to it, so it never changes.

Every element appears in a view and relates to another, or the check flags it. An element that belongs on no view relaxes `structurizr.inspection.model.element.noview` on itself, with the reason beside it – a view is never padded to quiet the check. A system beyond what `include *` reaches is included in the context view by name.

## What the check enforces

`pnpm check:arch` fails, naming the fault, when the workspace does not parse, a view names an undefined element, an element has no description, a container has no technology, a relationship has no label, or an element relates to nothing or appears in no view. The workspace relaxes technology on relationships, because a label is a verb phrase, and documentation and decisions on the system in scope, because those live under `docs/`.

Nothing checks that the committed SVGs match the model – not `check:arch`, which stays out of `pre-push` because it pulls a large image, and not `check_architecture.yml`. Re-export after every model change and read the diff.
