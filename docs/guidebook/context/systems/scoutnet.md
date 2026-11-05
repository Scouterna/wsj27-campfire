# Scoutnet

Scoutnet is Scouterna's membership system, owned and run by Scouterna. It knows who is a member, which scout group they belong to, and what they have signed up for – including the WSJ27 project and its registration forms.

## What Campfire uses it for

Campfire never calls Scoutnet directly. Scoutnet sits behind it twice, through two other systems:

- **Through [ScoutID](./scoutid), for who someone is.** ScoutID checks every sign-in against Scoutnet.
- **Through the [participants service](./participants-service), for who is in the contingent.** The service reads the project's participants and their form answers from Scoutnet, decodes them, and caches them, because Scoutnet answers slowly. The contingent management team's functions are one of those answers, to a question only project admins see and edit. It also writes back: a unit's patrols are stored in Scoutnet as each deltagare's answer to the Patrull question.

Both paths carry the Scoutnet member number, so a session and a row in the list of participants name the same person without any mapping between them. The member number is also the address of a person's page in Campfire.

## What Campfire holds itself

Some of what Campfire shows is not in Scoutnet:

- The units' names, colors, and glyphs are Campfire's own.
