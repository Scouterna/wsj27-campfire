# The people Campfire is drawn for, named as the audience list in
# `.github/ISSUE_TEMPLATE/feature.yml` names them, so an issue and these diagrams name the
# same groups.
#
# The scouts are not here. They are data in the list of participants, not users of the
# app, and drawing them as people would promise a surface that does not exist.

# The people Campfire is built for. They all get the same app, and what separates them is
# the part of the contingent each answers for, not the surface.

leaders = person "Leaders" {
  description "The adults who lead a unit, from preparation to the jamboree."
  tags "user"
}

cmtAdministration = person "CMT – Administration" {
  description "The function for the contingent's finances, legal matters, and records."
  tags "user"
}

cmtCommunication = person "CMT – Communication" {
  description "The function that keeps every member of the contingent informed."
  tags "user"
}

# Support is one function, and each of its parts is drawn as a person of its own for the
# same reason the functions are.

cmtHealth = person "CMT – Health" {
  description "The part of Support that looks after health, care, and welfare."
  tags "user"
}

cmtIstSupport = person "CMT – IST support" {
  description "The part of Support that selects and follows the contingent's IST."
  tags "user"
}

cmtProgram = person "CMT – Program" {
  description "The function that plans what the contingent does around the jamboree."
  tags "user"
}

cmtUnitSupport = person "CMT – Unit support" {
  description "The part of Support that composes and follows the units."
  tags "user"
}

cmtHeadOfContingent = person "CMT – Head of Contingent" {
  description "The people who lead the contingent and answer for it."
  tags "user"
}

# Not a user of the app, and drawn anyway, because the team that builds it is a
# real force on this architecture.

developers = person "Developers" {
  description "The people who build and maintain Campfire rather than use it."
  tags "internal"
}
