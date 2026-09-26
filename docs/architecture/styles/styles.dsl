# Campfire and everything inside it take one red, and everything outside, beside, or never
# shipped takes a muted hue against it. The mapping is in AGENTS.md, under "The palette".

# The system in scope and its containers share one fill, so a box that is Campfire's looks
# it at either level.
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

# The product, in the same red as the application and the shells it ships as.
element "product" {
  shape roundedbox
  background #ce4a17
  color #ffffff
}

# A shell takes the phone shape, because it ships as a phone app rather than a generic
# box.
element "app" {
  shape MobileDevicePortrait
  background #ce4a17
  color #ffffff
}

# A module or a library takes a lighter shade of the red, so it reads as part of Campfire
# and apart from the apps that assemble it.
element "module" {
  shape roundedbox
  background #e66b45
  color #ffffff
}

# A person takes the palette's darker red, so it reads as the system's family without
# competing with it.
element "Person" {
  shape person
  background #9a3616
  color #ffffff
}

# An audience Campfire is built for.
element "user" {
  background #9a3616
  color #ffffff
}

# The developers take a neutral slate, because they build Campfire and use none of it.
element "internal" {
  background #5a6b78
  color #ffffff
}

# A back-end service takes a muted teal, so it reads as adjacent to Campfire rather than
# as part of it or a stranger to it.
element "service" {
  background #2f6377
  color #ffffff
}

# A system outside the boundary entirely takes gray.
element "external" {
  background #667079
  color #ffffff
}

# What is ours and never ships, such as the mock, takes a muted brown that belongs with
# the palette.
element "development" {
  background #7d6a4f
  color #ffffff
}

# Every relationship is one solid orthogonal line, and `dashed false` is not redundant,
# because the renderer's default is dashed. What is uncertain says so in its label,
# starting with "May", rather than in a second line style.
relationship "Relationship" {
  color #4a5560
  thickness 2
  routing Orthogonal
  dashed false
}
