# The nine people Campfire is drawn for. They are the audience list in
# `.github/ISSUE_TEMPLATE/feature.yml`, word for word, so an issue, the project board,
# and these diagrams name the same groups rather than three overlapping sets.
#
# The contingent is about 2,600 people in 53 units, and the scouts are not on this
# diagram: they are data in the register, not users of the app, and drawing them as
# people would promise a surface that does not exist.

# The people Campfire is built for (8). Eight audiences, one app – what differs between
# them is scope and attention, not surface: a leader sees their own unit, a CMT function
# sees the contingent through the part of it they answer for.

leaders = person "Leaders" {
  description "The adults who lead a unit of the contingent, at home and at camp."
  tags "user"
}

cmtAdministration = person "CMT – Administration" {
  description "The function that runs the contingent's finances and administration."
  tags "user"
}

cmtCommunication = person "CMT – Communication" {
  description "The function that runs the contingent's communication and profile."
  tags "user"
}

# Support is one function with three parts, and each part is an audience of its own:
# what a health team reads about a participant, an IST team about its patrols, and a
# unit team about its leaders differ in scope and attention, not in surface.

cmtHealth = person "CMT – Health" {
  description "The part of Support that looks after health, care, and welfare."
  tags "user"
}

cmtIstSupport = person "CMT – IST support" {
  description "The part of Support that selects and follows the IST members."
  tags "user"
}

cmtProgram = person "CMT – Program" {
  description "The function that plans the contingent's program and preparation."
  tags "user"
}

cmtUnitSupport = person "CMT – Unit support" {
  description "The part of Support that selects, prepares, and follows the units."
  tags "user"
}

cmtHeadOfContingent = person "CMT – Head of Contingent" {
  description "The people who lead the contingent and answer for it."
  tags "user"
}

# Internal (1). Not a user of the finished app, and on the diagram anyway: a two-person
# team is a real force on this architecture, and the picture is more honest with them
# on it.

developers = person "Developers" {
  description "The people who build and maintain Campfire without being users of it."
  tags "internal"
}
