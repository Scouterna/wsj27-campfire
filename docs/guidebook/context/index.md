# Context

Campfire is the digital companion for Scouterna's Swedish contingent to the World Scout Jamboree 2027, on Wyspa Sobieszewska in Gdansk, Poland. Its users are the unit leaders and the contingent management team, the CMT. The scouts and the IST are in the list of participants Campfire shows, not among its users. This chapter places Campfire in its surroundings: the people who use it, and the systems it depends on.

Campfire holds no data and no identity of its own. A member signs in with ScoutID through the auth service ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)), and the list of participants comes from the participants service, which reads it from Scoutnet. What Campfire adds is shape – each unit in its own color, the CMT's functions told apart, and what a leader needs on a phone in a field with bad reception.

The system context diagram shows where Campfire fits.

![System context diagram. The leaders and the CMT functions – Administration, Communication, Health, IST support, Program, Unit support, and Head of Contingent – use Campfire, and the developers build and maintain it through GitHub. Campfire signs members in and out through the auth service, sends them to sign in at ScoutID, and reads the list of participants from the participants service. The auth service completes the sign-in with ScoutID. ScoutID verifies sign-ins against Scoutnet, and the participants service reads its member data from Scoutnet.](../../architecture/diagrams/systemContext.svg)

## The people

The diagram names each CMT function as a person of its own, because what separates them is the part of the contingent each answers for. Support is one function with three parts – Health, IST support, and Unit support – and each part is drawn separately for the same reason. The same people are the audience an issue chooses from, so an issue, the guidebook, and the diagrams name the same groups.

Everyone gets the same application – the same screens, colors, and offline behavior – and the back-end decides what each of them may read. A leader reads their own unit, their scouts' health answers included. Every CMT function reads the whole contingent, and only a health grant adds the health answers.

| Person                                                      | What they do, and why they use Campfire                                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Leaders](./people/leaders)                                 | Lead a unit, and use Campfire to know and reach their scouts and their leader team                   |
| [CMT – Administration](./people/cmt-administration)         | Run finances and the contingent's records, and look up and reach anyone in the contingent            |
| [CMT – Communication](./people/cmt-communication)           | Keep every member informed, and reach the people a message is for                                    |
| [CMT – Health](./people/cmt-health)                         | Help with health questions, and read a participant's health answers                                  |
| [CMT – IST support](./people/cmt-ist-support)               | Select and follow the IST, and see and reach them as one group                                       |
| [CMT – Program](./people/cmt-program)                       | Plan the meetings before the trip, the round trip, and the program, around the units and the leaders |
| [CMT – Unit support](./people/cmt-unit-support)             | Compose and follow the units, and answer members who do not know whom to ask                         |
| [CMT – Head of Contingent](./people/cmt-head-of-contingent) | Lead the contingent, and see all of it at a glance                                                   |
| [Developers](./people/developers)                           | Build and maintain Campfire rather than use it                                                       |

## The systems it depends on

The auth service and the participants service are the WSJ27 project's own back-end, written in Python. They sit outside the Campfire box because each lives in a repository of its own and ships as its own container ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)). Campfire reaches them at a path on the origin it is served from, never at a host of their own ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). ScoutID and Scoutnet are Scouterna's, and nobody in this project writes them.

| System                                                 | What it does for Campfire                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| [Auth service](./systems/auth-service)                 | Signs a member in through ScoutID, and holds the session and its roles   |
| [Participants service](./systems/participants-service) | Serves the list of participants, and decides who may read what           |
| [ScoutID](./systems/scoutid)                           | Scouterna's single sign-on, where every member proves who they are       |
| [Scoutnet](./systems/scoutnet)                         | Scouterna's membership system, where the list of participants comes from |

GitHub is on the diagram as the developers' tool – it holds the code, runs the checks, and publishes what ships. Campfire never talks to it, so it is described on the [Developers](./people/developers) page rather than here.
