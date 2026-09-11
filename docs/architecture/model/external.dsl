# The systems Campfire does not own and does not build. Each is described by what it
# does for Campfire, in one clause of about the same length, so the boxes read as a set.
#
# Scoutnet is the one Campfire never reaches itself: the participants service reads it.

scoutid = softwareSystem "ScoutID" {
  description "Scouterna's identity provider, where every member signs in."
  tags "external"
}

scoutnet = softwareSystem "Scoutnet" {
  description "Scouterna's member registry, behind ScoutID."
  tags "external"
}

github = softwareSystem "GitHub" {
  description "The service that holds the repository and runs the checks."
  tags "external"
}
