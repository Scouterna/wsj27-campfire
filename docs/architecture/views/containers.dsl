# One container view for the whole system – Campfire is one product with one audience,
# so there is nothing to split it by. The mock is excluded, and its relationships go
# with it: this level shows what the contingent's application depends on, and the mock
# is a developer tool, never a runtime dependency of anything shipped.

container campfire "containers" {
  include *
  exclude mock

  # The developers reach the mock and the system as a whole, never a container a member
  # uses, so they say nothing at this level.
  exclude developers

  # The three libraries are what the modules are built from, not what the product does:
  # every module reaches all of them, so drawing them adds a fan of arrows and no fact
  # about the product's shape. Which library does what is the code's own business.
  exclude hostLibrary uiLibrary utilsLibrary

  description "The product, the apps it ships as, the modules, and which module talks to which service."
}
