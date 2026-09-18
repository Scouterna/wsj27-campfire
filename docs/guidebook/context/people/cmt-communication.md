# CMT – Communication

Communication owns the contingent's profile and its channels, markets the jamboree, keeps every audience informed before, during, and after it, and evaluates the experience afterwards. In practice that means the contingent's page on scouterna.se, its social accounts, the FAQ, and the mail that gets answered.

The participants service calls the function **Kommunikation**, and its color in the contingent's identity is red.

## At camp and before it

Before camp, Communication is the function that turns a decision into something roughly 2,600 people have actually read: acceptance notices, travel codes, packing lists, the profile package, the two förträffar, and the endless correction of dates that moved. During camp the audience doubles – the contingent on the island, and several thousand parents at home refreshing a feed.

The day-to-day talking, though, happens on Discord. That is where the contingent already is, and Campfire deliberately does not integrate with it: duplicating a channel that works would split the conversation in half. Communication's tools are therefore mostly outside this product, and that is a decision rather than a gap.

## In the application

Communication gets the same application every other CMT function gets: the list of participants, searchable and unscoped, with a person's page behind each row. There is no broadcast surface, and none is being built: nothing in the application sends anything, publishes a post, or lets somebody compose one.

The one piece of copy the application holds is the start screen's messages – a welcome saying what Campfire is, and after it only the rare thing that has to be said to somebody with the application open. They are written into the application and arrive with a release, and they are never news: what is new in Campfire is announced on Discord to the leaders and on Teams to the management, and each welcome points its reader to the right one. Their wording is Communication's to have a say in.

What the application also carries that touches this function is the contingent's visual identity – the five unit colors and the Bravely Script display face taken from the jamboree's theme, both in `libraries/ui` – and the unit logotypes, in the unit identity table the participants module holds. That work is described in [Design](../../design/), and it is Communication's material as much as anyone's.

## What it is meant to give them

Open. Communication is on the audience list so an issue can be addressed to them, and a surface where the function publishes on its own has never been specified. The start screen's messages answered why they are not Discord before they were built – they reach a person at the moment they open Campfire, and they say what Campfire is – and a publishing surface owes the same answer, written down before the screen is.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:kommunikation` marks the function, and the front-end does nothing with the distinction – any `wsj27:cmt` role reads as management, so Communication sees the same screens as Administration and Program.

The health answers stay behind [the health grants](./cmt-health), which Communication does not carry.
