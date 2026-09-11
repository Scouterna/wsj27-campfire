# One file per view, each with a stable, human-authored key. The key names the exported
# file (systemContext.svg) and every reference to it from a chapter, and it does not
# change on a rebuild. Adding a view needs only a new file, an export, and a chapter
# reference – no new mechanism.

systemContext campfire "systemContext" {
  include *
  # Two systems sit one step further out than `include *` reaches, and both belong here.
  # GitHub relates to the developers rather than to Campfire, and a repository that also
  # runs the checks and holds the published image is part of the picture. Scoutnet
  # relates to the participants service rather than to Campfire, which is exactly the
  # point: the member data would arrive through that service, not around it.
  include github
  include scoutnet
  description "Campfire among the people it is built for, the services behind it, and the systems around them."
}
