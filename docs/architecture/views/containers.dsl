# One container view for the whole system, because there is nothing to split it by. The
# mock is excluded with its relationships, because this level shows what the shipped
# product depends on and the mock never ships.

container campfire "containers" {
  include *
  exclude mock

  # The developers reach the mock and the system as a whole, never a container a member
  # uses, so they say nothing at this level.
  exclude developers

  # Every module reaches the same libraries, so drawing them adds a fan of arrows and no
  # fact about the product's shape.
  exclude hostLibrary uiLibrary utilsLibrary

  description "The product, the apps it ships as, the modules, and which module talks to which service."
}
