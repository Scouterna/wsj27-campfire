# The key names the exported file and every guidebook reference to it, so it never
# changes.

systemContext campfire "systemContext" {
  include *
  # GitHub and Scoutnet relate to a neighbor rather than to Campfire, so `include *` does
  # not reach them. Both belong here, because GitHub is where Campfire is built, and
  # Scoutnet shows that the member data arrives through the services rather than around
  # them.
  include github
  include scoutnet
  description "Campfire among the people it is built for, the services behind it, and the systems around them."
}
