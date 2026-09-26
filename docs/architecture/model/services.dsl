# The back-end services. Each lives in its own repository and ships on its own, so each is
# a software system beside Campfire rather than a container of it.

authService = softwareSystem "Auth service" {
  description "The service that turns a ScoutID sign-in into a session with roles."
  tags "service"
}

participantsService = softwareSystem "Participants service" {
  description "The service that serves the list of participants, deciding who reads what."
  tags "service"
}
