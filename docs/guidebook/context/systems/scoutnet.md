# Scoutnet

Scoutnet is Scouterna's member registry – the system that knows who is a member, which scout group they belong to, and what they have signed up for. It is shared with KFUM's scout groups, and it is the other half of Scouterna's digital infrastructure beside [ScoutID](./scoutid).

Campfire never talks to it directly. Every path to Scoutnet runs through another system.

## Scoutnet sits behind Campfire twice

That is the thing to hold on to, because the two paths are easy to collapse into one.

- **Through ScoutID, for who you are.** ScoutID authenticates against Scoutnet – the registry is what stands behind the sign-in, and ScoutID is the front door to it. A signed-in session's preferred username is `scoutnet|<member number>`, so the registry's own key comes back through the identity round trip.
- **Through the participants service, for who is in the contingent.** The [participants service](./participants-service) fetches the WSJ27 project's participants, forms, and answers from Scoutnet's project API, with the project keys it is configured with, and the register arrives at the front-end over `/api/project` like everything else.

The context diagram draws both. Scoutnet hangs off ScoutID on a line labeled "Verifies sign-ins against", and off the participants service on one labeled "Reads the contingent's member data from", and it is on the diagram at all only because the view names it explicitly – nothing it touches is one step from Campfire.

## Why the two paths agree

Campfire reads a register whose only stable key is the member number – the address of a person's page is their member number. The identity side agrees on that key: a session's preferred username is `scoutnet|<member number>`, and it is the member number the participants service derives roles by. One registry stands behind both paths, which is what lets a session and a register row mean the same person without a mapping table anywhere.

## What Campfire holds itself

Some of what a participant page shows is not register data at any source, and will not be:

- The unit identities – name, color, and logotype per unit number. Campfire's own table, held in the participants module and edited in one file. It maps each unit onto one of the five colors the [design system](../../design/) carries.
- The CMT functions. Scoutnet's forms carry no funktion, so the participants service reads it from the contingent's own list and mints it into the `wsj27:cmt:*` roles.

The front-end validates every field at the boundary and drops a bad row rather than trusting it, because the register is a separate service that will change shape over an eighteen-month build.

## What stands in for it locally

Nothing, directly – the [mock](../../testing/mock) stands in for the services in front of it rather than for Scoutnet itself. Its seed is Scoutnet-shaped all the same: every answer keyed by a question key and carrying the Swedish label the registry would export, spelling quirks included. The record builder walks the form definition, so an answer no question asks for never reaches the wire – exactly as an answer outside the real decoder's template never leaves the real service.
