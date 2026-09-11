# Requirements

This chapter is what Campfire has to do and how well it has to do it. Two things are true at the same time, and the chapter says both: the constraints are settled and recorded as decisions, while the feature set beyond the first feature is open and gets discovered through issues and iteration. Where something is genuinely undecided, it says so rather than inventing a requirement to look complete.

Campfire owns very little of its own. The register it shows belongs to the contingent, identity belongs to ScoutID, and the application is a client over two back-end services that own the truth (see [Context](../context/)). That shapes almost everything in the pages below, and so do the three weeks in a field in Poland the whole product is aimed at.

The chapter is in three parts, each its own page:

| Part                            | What it covers                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Scope](./scope)                | What Campfire is for, the first feature, the anchors behind it, what version 1 is made of, what is still open, and what it leaves to someone else |
| [Constraints](./constraints)    | The fixed boundaries it is built inside – one origin, one web application in thin shells, a back-end in other repositories                        |
| [Quality attributes](./quality) | The qualities it is judged on – deployability first, then working offline, privacy, accessibility, and the rest                                   |
