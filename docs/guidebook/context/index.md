# Context

Campfire is the digital companion for Scouterna's Swedish contingent to the World Scout Jamboree 2027 – roughly 2,600 people in 53 units, traveling to Wyspa Sobieszewska outside Gdansk in Poland at the end of July 2027. Its users are the unit leaders and the contingent management team, the CMT; the scouts themselves are in the list of participants Campfire reads, not in front of it. This chapter places it in its surroundings: the people who use it, and the systems it depends on.

The application holds no data and no identity of its own. It signs members in through the auth service, which completes the round trip with ScoutID ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)), and it reads the contingent's list of participants from the participants service, which is fed from Scoutnet. What Campfire adds is shape – which unit works in which color, what a CMT function is, and what a leader needs on a phone standing in a field with bad reception. The system context diagram below shows where Campfire fits.

![System context diagram, rendered from the model. Campfire stands in the middle of it. Eight audiences use the application – the unit leaders, who follow their own unit and the trip, and the contingent management team's functions, Administration, Communication, Program, and Head of Contingent, and the three parts of Support, Health, IST support, and Unit support, each following the part of the contingent it answers for. A ninth person, the internal developers, builds and maintains Campfire instead of using it, and works through GitHub, which is the only reason GitHub is on the picture at all. Two back-end services sit below Campfire: it signs members in and out through the auth service, and it reads the contingent's list of participants from the participants service. Campfire also sends a member to ScoutID to sign in, and the auth service completes the OpenID round trip with that same ScoutID. Scoutnet sits one step further out and is reached twice, once by ScoutID verifying a sign-in and once by the participants service reading member data. Every relationship is drawn as a solid line.](../../architecture/diagrams/systemContext.svg)

The diagram is rendered from the architecture model under `docs/architecture/`, not drawn by hand, so it cannot quietly drift from the description below.

## The people

The contingent's own vocabulary has four participation roles – deltagare, ledare, IST, and kontingentledning. Campfire is built for two of them, and the diagram still names nine people, because the CMT is not one audience but five functions with one of them split three ways, and the two developers belong on the picture as well. The nine are the audience list in `.github/ISSUE_TEMPLATE/feature.yml`, word for word, so an issue, the guidebook, and these diagrams name the same groups rather than three overlapping sets.

A leader leads a unit and needs their unit. A CMT function works across every unit and needs the part of the contingent it answers for. All eight see the same application – the same screens, the same colors, the same offline behavior – with what they may read decided on the back-end rather than in the app.

| Person                   | What they do                                                                                                                                  | Page                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Leaders                  | Lead one of the contingent's units, at home and at camp                                                                                       | [`leaders.md`](/context/people/leaders)                               |
| CMT – Administration     | Run the finances, travel, housing, insurance, registrations, invoicing, inbound support, and the HQ                                           | [`cmt-administration.md`](/context/people/cmt-administration)         |
| CMT – Communication      | Own the profile and the channels, market the jamboree, keep every audience informed before, during, and after it, and evaluate the experience | [`cmt-communication.md`](/context/people/cmt-communication)           |
| CMT – Health             | Help the units and the IST with health questions, run Listening Ears, and prepare personal matters                                            | [`cmt-health.md`](/context/people/cmt-health)                         |
| CMT – IST support        | Select and follow the IST members, support their units, and work with the host on the IST's roles                                             | [`cmt-ist-support.md`](/context/people/cmt-ist-support)               |
| CMT – Program            | Plan the program, from the preparation of everyone through the round trip and the gatherings to the Swedish contributions at camp             | [`cmt-program.md`](/context/people/cmt-program)                       |
| CMT – Unit support       | Select and compose the leader teams and participants, prepare them with Program, and follow and support every unit                            | [`cmt-unit-support.md`](/context/people/cmt-unit-support)             |
| CMT – Head of Contingent | Lead the contingent, and answer for it                                                                                                        | [`cmt-head-of-contingent.md`](/context/people/cmt-head-of-contingent) |
| Developers               | Build and maintain Campfire, and never use it                                                                                                 | [`developers.md`](/context/people/developers)                         |

One page each, on purpose. What separates the CMT functions is which slice of the contingent they answer for, and a page per function can say what that slice is, what the function's year actually looks like, and how much of it Campfire touches – which for several of them is very little.

Support is one function with three parts – Health, IST support, and Unit support – and each part is an audience of its own: what a health team reads about a participant, an IST team about its patrols, and a unit team about its leaders differ in scope and attention, not in surface.

The scouts and the IST are in the list of participants but not on the diagram as users. Nothing rules out a participant-facing surface later, and if one arrives it is a person and a line added to the model rather than a footnote.

## The systems it depends on

Four systems sit around Campfire. Two of them are its own, written by this project in Python; they still sit outside the Campfire box because each lives in its own repository and ships as its own container ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)) – a system in the C4 sense, not a part of this one. They are reached at a path on the same origin the application is served from, never at a host of their own ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). The other two are Scouterna's, and nobody here writes them.

| System               | What it does for Campfire                                           | Page                                                               |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Auth service         | Turns a ScoutID round trip into the session behind `/api/auth`      | [`auth-service.md`](/context/systems/auth-service)                 |
| Participants service | Serves the contingent's list of participants behind `/api/project`  | [`participants-service.md`](/context/systems/participants-service) |
| ScoutID              | Scouterna's identity provider, where every sign-in happens          | [`scoutid.md`](/context/systems/scoutid)                           |
| Scoutnet             | Scouterna's member registry, the source of the list of participants | [`scoutnet.md`](/context/systems/scoutnet)                         |

GitHub is on the diagram too, and it is not in that table. It serves the [Developers](./people/developers) rather than Campfire – no line runs between the two – so it is described on their page, where the rest of how the work gets built and published lives.
