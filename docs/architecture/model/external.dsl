# The systems Campfire does not own and does not build. Scoutnet is the one Campfire
# never reaches itself, because ScoutID and the participants service stand in front of it.

scoutid = softwareSystem "ScoutID" {
  description "Scouterna's single sign-on, where every member proves who they are."
  tags "external"
}

scoutnet = softwareSystem "Scoutnet" {
  description "Scouterna's membership system, where the list of participants comes from."
  tags "external"
}

github = softwareSystem "GitHub" {
  description "The service where the code is kept, checked, and published."
  tags "external"
}
