# The semantic palette. The app itself is themed five ways – one color per unit – so none
# of those five is Campfire's own; the diagrams take the contingent's official red
# instead, the one color that means the contingent rather than a unit. Anchored there for
# everything inside the boundary, and extended into four muted hues for what is outside
# it, beside it, or never shipped. The full mapping is in AGENTS.md, under "The palette".

# The system in scope, and everything it is made of – the contingent's official red, the
# subject of every diagram. One fill at both levels, so a box that is Campfire's looks
# like Campfire's whether it is the system or a container.
element "Software System" {
  shape roundedbox
  background #ce4a17
  color #ffffff
}

element "Container" {
  shape roundedbox
  background #ce4a17
  color #ffffff
}

# The product – Campfire as a member knows it, one name over the three it ships as. It is
# what a person reaches, so it carries the official red at full strength, with the
# application and the shells beneath it in the same red.
element "product" {
  shape roundedbox
  background #ce4a17
  color #ffffff
}

# The two shells – the mobile device shape from the C4 shape vocabulary, since each is a
# shippable phone app rather than a generic box. The same red as any other container in
# scope.
element "app" {
  shape MobileDevicePortrait
  background #ce4a17
  color #ffffff
}

# A module or a library – modeled as a container alongside the apps rather than nested
# inside the application, since each is a package of its own that the application
# assembles. The official red's lighter shade keeps it read as part of Campfire, distinct
# from the apps that assemble it.
element "module" {
  shape roundedbox
  background #e66b45
  color #ffffff
}

# People – the person shape, in the darker red the app uses as that theme's ink, so a
# person reads as the same family as the system without competing with it.
element "Person" {
  shape person
  background #9a3616
  color #ffffff
}

# The people Campfire is built for – the ink red, full strength.
element "user" {
  background #9a3616
  color #ffffff
}

# The developers – a neutral slate, on the context diagram and users of none of it.
element "internal" {
  background #5a6b78
  color #ffffff
}

# The back-end services – ours to depend on, and nobody's here to build: each is a
# separate repository, a separate image, and a separate deployment. The teal the shells
# and the web already share, muted, so a service reads as adjacent to Campfire rather
# than as part of it or as a stranger to it.
element "service" {
  background #2f6377
  color #ffffff
}

# External systems – gray, outside the boundary and outside this repository entirely.
element "external" {
  background #667079
  color #ffffff
}

# The mock back-end – ours, and it never ships. The contingent's brown, muted: a
# workbench color, related to the palette without being one of the five unit themes.
element "development" {
  background #7d6a4f
  color #ffffff
}

# Every relationship, on every diagram, is one solid orthogonal line. `dashed false` is
# not redundant – the renderer's own default is dashed – and there is no second line
# style anywhere: what is uncertain says so in its label, starting with "May", where a
# reader can read it.
relationship "Relationship" {
  color #4a5560
  thickness 2
  routing Orthogonal
  dashed false
}
