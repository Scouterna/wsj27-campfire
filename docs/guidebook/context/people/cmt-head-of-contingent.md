# CMT – Head of Contingent

The Head of Contingent leads the contingent and answers for it. In WOSM's terms the HOC is part of the CMT, is appointed by the national scout organization, and cannot serve as an adult patrol leader or as IST – the job is leading, not staffing. Sweden's contingent is led by three of them, heading the collaborating functional areas.

The register calls the function **Kontingentledare**, and its color in the contingent's identity is brown.

## At camp and before it

The HOC's calendar is the one that starts earliest and ends latest. National organizations were asked to appoint their head of contingent by 1 November 2024, and the Head of Contingent Meetings have run since: online in December 2024, Gdansk in September 2025, Gdansk again 22–26 July 2026, and a final one 2–4 April 2027. The Bulletins arrive between them, five of them by February 2027, and each one can move something the contingent had already planned around.

At camp the HOC is the contingent's face toward the organizers and its last word internally. They do not need detail so much as a current picture – whether the 53 units are accounted for, what is unresolved, and what needs a decision today rather than at the evening meeting.

## In the application

The same application as everyone else, with the same unscoped register behind the participants section. Nothing in the application is shaped for leading: there is no overview of the contingent, no roll-up of the units, and no dashboard beyond the countdown and the register.

The picture an HOC actually wants is the output of the status-reporting anchor, and that anchor has not been specified.

## What it is meant to give them

Status reporting, when it exists, is the surface aimed at this person more than any other: 53 units reporting into one place, current rather than reconstructed. The lightweight issue list is the same story a level down – what is open, who owns it, what is closed. Both are directions rather than specifications, and [Scope](../../requirements/scope) says so.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:kontingentledare` marks the function, and the front-end reads it as management – identical to the other functions, wording included.

Any `wsj27:cmt` role reads the whole register at the basic level, the head of contingent's included. The health answers are not: they stay behind [the health grants](./cmt-health), and leading the contingent is deliberately not one of them.
