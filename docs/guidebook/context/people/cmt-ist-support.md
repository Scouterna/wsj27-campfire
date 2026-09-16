# CMT – IST support

IST support is one of the three parts of the Support function. It selects and follows the contingent's International Service Team – the adult volunteers, 18 and over, who staff the jamboree – supports their units, and works with the host on the IST's roles. They are the part of the contingent nobody else's scope covers, which is precisely why the function exists.

The participants service calls the function **IST-support**, and its color in the contingent's identity is green.

## At camp and before it

IST are recruited through their contingent and then handed to the host: ZHP plans and assigns the jobs, worldwide, not Sweden. A Swedish IST member might end up running a program base, cooking, driving visitors, or photographing the camp, and their Swedish leadership finds out what they were given rather than deciding it. The one Swedish-run exception is the Foodhouse, a camp restaurant serving Swedish food and running activities for international participants, which recruits its own volunteers.

IST are organized in patrols rather than units, so an IST member has no unit leader looking after them – their line back to Sweden runs through this function alone. Travel is different too: the Baltic round trip is offered only to the younger IST, and everyone else books and pays their own journey, an egen resa. Rovers aged 18 to 25 can join a multi-stop tour with activities before the jamboree.

## In the application

IST support gets the same list of participants as the other CMT functions, and one filter chip of it is theirs: narrowing the list to the IST members. An IST member carries a patrol number in the same field a unit number would use, so the model reads that field one way for deltagare and ledare and the other way for IST, and a person's page shows their patrol instead of their unit.

Two limits come with it. The unit identity table Campfire holds, described on the [Scoutnet](../systems/scoutnet) page, has no patrol in it, so an IST patrol draws the contingent's default color until the patrols are given colors of their own. And a unit leader's scope excludes their unit's IST on purpose, which means the only person who can see an IST member in the app is a function with the whole list of participants in scope.

## What it is meant to give them

Nothing specific. Neither of Campfire's two anchors is aimed at IST support, and no IST-specific surface has been specified – no patrol view, no job assignment, no way to reach a patrol as a group. Naming that plainly is more useful than sketching a screen; if the function needs one, it starts as an issue.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:support:ist-support` marks the `roll` within the Support function, and the front-end reads it as management without distinguishing it from the other functions.

IST support reads the whole list of participants at the basic level, like the rest of the management. The health answers stay behind [the health grants](./cmt-health), which IST support does not carry.
