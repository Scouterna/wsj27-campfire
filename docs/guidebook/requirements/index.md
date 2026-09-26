# Requirements

This chapter is what Campfire has to do and what it holds to while doing it. The constraints are settled and recorded as decisions. The features beyond version 1 are not: each is decided one issue at a time, and gets its own requirements when it is picked up ([Process](../process/)).

Campfire owns very little itself. The list of participants belongs to the contingent and is kept in Scoutnet, identity belongs to ScoutID, and the back-end services decide who may read what ([Context](../context/)). Campfire is a client over them, and that shapes most of what follows. So does where it is used: three weeks of travel and camp, where the network is unreliable and the people who could fix a problem are on the same trip.

| Page                            | What it covers                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| [Scope](./scope)                | Who Campfire is for, what version 1 does, where it goes next, and what it leaves to others    |
| [Constraints](./constraints)    | The fixed boundaries it is built inside, and the ones the work itself sets                    |
| [Quality attributes](./quality) | The qualities it is judged on – deployability first, then availability, privacy, and the rest |
