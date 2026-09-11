# CMT – Administration

The contingent management team – CMT, or lagerledningen in Swedish – is the volunteer leadership of the Swedish contingent, and Administration is its paperwork half: finances, travel, housing, insurance, registrations, invoicing, inbound support, and the HQ. It is the structural, spreadsheet-shaped work that keeps roughly 2,600 registrations straight.

The register calls the function **Administration**, and its color in the contingent's identity is yellow.

## At camp and before it

Most of Administration's year happens long before Poland. The contingent pays the Jamboree Organisation as a single remittance in Polish Zloty on a fixed schedule – a deposit, then payments in May 2026, November 2026, and April 2027 – and a late payment carries a 5% service fee and risks the allocation. Personal-data registration opened 15 May 2026 and closes 1 January 2027, which is the window in which the register Campfire reads gets filled in at all.

At camp the work turns into the questions that have documents behind them: who is actually registered, who paid, whose insurance covers what, and who is allowed to be where. Administration is also where the awkward cases land – a visa refusal, a cancellation, a person on the waitlist who suddenly has a place.

## In the application

Administration signs into the same application every leader gets and sees a wider slice of it. Their section menu offers the whole register rather than one unit: a search across name, belonging, and member number, and filter chips for the participation roles. Opening a person shows what the back-end sent for them, each section rendering only when its data arrived.

Nothing in the design is built for the finance and paperwork side. There is no fee, no payment state, and no document anywhere in the application, and saying so is more useful than describing a screen nobody has specified. What Administration gets is a fast, searchable roster – which, when the question is "does this person exist and how do we reach them", is not nothing.

## What it is meant to give them

Nothing specific is promised. Administration is on the audience list in `.github/ISSUE_TEMPLATE/feature.yml` so that an issue can name them, and the two anchors Campfire is aimed at – status reporting and lightweight issue tracking – are not theirs first. If the function's work reaches the product, it arrives as an issue that says what problem it solves, the way [Scope](../../requirements/scope) describes.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:admin` marks the function, minted by the [participants service](../systems/participants-service) from the contingent's own funktion mapping.

The front-end does not act on which function it is: any `wsj27:cmt` role reads as management, so every function gets the same screens and the same wording. What each function may read is the service's call – every `wsj27:cmt` role reads the whole register at the basic level, and the health answers need a [health grant](./cmt-health) the administration does not carry.
