# Maintenance

This chapter is how Campfire is kept running once it is in people's hands. Three things carry a version – the web image and the two shells – and each is released on its own schedule. The web releases itself from the merge that earns a version, runs on dev at once, and reaches prod only when a maintainer promotes it. How the shells reach a phone, and how anyone learns that something has broken, are open decisions, and the pages say what shapes them.

| Part                       | What it covers                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| [Release](./release)       | How each artifact is versioned, what a merge publishes, and how the web reaches dev and prod |
| [Monitoring](./monitoring) | Errors, usage, and whether the back-end answers – and what shapes that open decision         |

Each open decision is recorded as an ADR once it is made, and the page that names it describes what was chosen.
