# CMT – Unit support

Unit support is one of the three parts of the Support function, and the contingent's first line. It selects and composes the leader teams and the participants, prepares them together with Program, and follows and supports every unit – it interviewed and reviewed the applications, and it is the contact point a contingent member reaches when they do not know which function owns their question.

The register calls the function **Avdelningssupport**, and its color in the contingent's identity is green.

## At camp and before it

Before camp, Unit support handles applications, waitlist places, travel codes, what to pack, and the reassurance a parent needs before handing over a fourteen-year-old for twelve days. The register's own free-text answers point the same way: every member can leave a note for their unit leader and a note for the contingent management, and the second of those two lands here.

On site, it is the function a leader calls when something has gone sideways and there is no obvious specialist – a bag on the wrong bus, a tent that will not do, a leader who needs relief for an afternoon. The CMT-jour number on a leader's home screen is that line, made tappable.

## In the application

Unit support signs in and gets the unscoped register: the whole contingent, searchable by name, belonging, and member number, with the role filters and a person's page behind every row. For a function whose job is being reachable and knowing who is who, that roster is the most directly useful thing Campfire does.

The CMT-jour plate on the leader home screen belongs to this function in spirit, and its number is one constant in one file, swapped there and nowhere else.

## What it is meant to give them

Lightweight issue tracking, the second anchor, is aimed at the health function first but describes Unit support's day just as well: something comes up, it needs an owner and a state, and a thread that scrolls away is not one. Status reporting, the first anchor, gives them the other half – a current picture of the 53 units instead of one reconstructed at the evening meeting. Both are directions rather than specifications, and neither has requirements.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:support` marks the function, with a `roll` appended where the contingent's funktion mapping carries one – `wsj27:cmt:support:halsa` being the one that changes what its holder may read – and the front-end reads any of them as management.

Unit support reads the whole register at the basic level. The health answers stay behind [the health grants](./cmt-health), which the plain support role does not carry.
