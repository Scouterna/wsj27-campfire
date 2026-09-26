# Scope

Campfire is for the people running Scouterna's contingent to WSJ27 – the leaders of the units and the contingent management team. Participants are not its audience. Their jamboree is the program, the patrol, and the subcamp, and it is the people looking after them who need a tool.

## Version 1

The first feature is that **leaders see the participants in their unit**. A leader signs in with ScoutID and gets their own unit's people – who they are, how to reach them, and what a leader needs to know about each of them, from diet to health. It comes first because everything after it reads from it: a status report is about a unit, and an issue is usually about a person.

Version 1 is made of three areas:

| Area         | What a person can do                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in      | Sign in with ScoutID, see their own profile, and sign out                                                                                                                             |
| Home         | Read the contingent's messages meant for their role, count down to the start of their own journey to Gdansk, and – for a leader – see their unit at a glance                          |
| Participants | Search the people they may read, open one person in full – contact details, diet, health, and readiness – and browse by unit, the International Service Team, and the management team |

The participants section is offered only to leaders and the management team. What each may read is decided by the participants service from their WSJ27 roles: a leader reads their own unit, the management team reads the whole contingent, and only a health grant opens the health answers beyond a leader's own unit. A person outside the reader's scope answers exactly like a person who does not exist.

The home screen's content and the participants section wait behind a reveal – a set moment when the units are announced – and until then the home screen shows only a countdown to it. The areas are built from feature modules that the web application composes, and none of them imports another ([Modules](../architecture/modules)).

## Where it goes next

Two directions follow version 1. Neither is specified: each gets its requirements from an issue when it is picked up ([Process](../process/)).

- **Status reporting.** During camp the management team needs to know how each unit is doing without walking the camp or chasing every leader in a chat. A leader answers for their unit from their phone, the answers land in one place, and the picture is current instead of reconstructed at the evening meeting.
- **Lightweight issue tracking.** Something comes up – a scout with a fever, a bag on the wrong bus, a leader who needs relief – and it needs an owner and a state, not a chat thread that scrolls away. The health team is the clearest user.

What Campfire grows into beyond those is decided the same way, one issue at a time.

## Out of scope

- **Participants as users.** A tool for 14-to-17-year-olds is a different product with different rules.
- **Communication.** Discord is where the contingent talks, before and during camp, and Campfire does not integrate with it. A second channel would split the conversation in half.
- **Keeping the list of participants.** The people, the units, and the roles are the contingent's own data, kept in Scoutnet. Campfire reads what the participants service publishes from it, and what that service publishes – in what shape, and to whom – is the service's call ([Scoutnet](../context/systems/scoutnet), [ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)).
- **The jamboree's program.** The camp, the subcamps, and the activities are run by the organizers, ZHP and WOSM. Campfire is the Swedish contingent's own tool beside them.
