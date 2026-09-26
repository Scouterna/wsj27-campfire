# Developers

The developers build and maintain Campfire rather than use it. Their work runs through GitHub, which holds the code, the issues, and the pull requests, runs the checks on every change ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)), and publishes what ships – the web image, the agent skills, and this guidebook. That is the only reason GitHub is on the context diagram: Campfire itself never talks to it.

The [Development](../../development/) chapter covers how they set up, run, and check the code, and the [Process](../../process/) chapter how work moves from an issue to a commit.

To see the application they sign in like anyone else, through ScoutID, or as one of [the mock's](../../testing/mock) personas when working locally. There is no developer role, so the only way to look at Campfire is the way its users do.
