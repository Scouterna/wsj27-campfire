# CMT – Program

Program plans what the contingent does: the preparation of everyone, the round trip and the gatherings on the way, and the Swedish contributions at camp. The jamboree's own program belongs to ZHP and WOSM; what Program owns is everything around it.

The participants service calls the function **Program**, and its color in the contingent's identity is blue – the contingent's default.

## At camp and before it

Program owns the Baltic tour through Latvia and Lithuania for the units that chose the rundresa, the two förträffar where a unit gets to know each other – autumn 2026 to build the group, spring 2027 to make it ready to travel – and the two in-person leader meetings across 2026 and 2027 with digital ones between.

That is a calendar spread over eighteen months, and it is a calendar the whole contingent plans its life around. The dates are fixed and public: departure 21–22 July 2027 for the round trip, 26–27 July for direct travel, the opening ceremony on 30 July, and home again 9–10 August.

## In the application

Program gets the unscoped list of participants like the other CMT functions, and a person's page carries the one field that is genuinely theirs: how that person travels. Rundresa, direktresa, or egen resa, as the list of participants worded it.

The countdown on the home screen is the other piece. It counts to departure and to camp from an itinerary that is fixed and public, and therefore lives in the journey module rather than being fetched from anywhere – there is no service to fetch it from, and an itinerary that has been printed does not need one. It reads a person's travel choice to know whether to count down to the pre-trip or straight to the camp, so a leader on the rundresa and a leader traveling direct see different dates.

No schedule, activity, förträff, or attendance is designed anywhere in the application.

## What it is meant to give them

Nothing specified. Program is on the audience list so an issue can name them; a program or schedule surface has never been designed, and neither anchor points at one. If the itinerary ever needs to change without a release, that is the moment the question gets asked properly.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:program` marks the function, and the front-end reads it as management without distinguishing it from the other functions.

Program reads the whole list of participants at the basic level. The health answers stay behind [the health grants](./cmt-health), which Program does not carry.
