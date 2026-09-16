# The back-end services. Each is written in Python, lives in its own repository, and
# ships as its own container image, so neither is a container of Campfire – they are
# software systems in their own right, and they belong on the context diagram beside
# the systems nobody here writes at all.
#
# What they have in common with Campfire is one origin: every path a browser or a shell
# asks for is answered by the same front door, which routes /api/auth and /api/project
# to these two and everything else to the web application.

authService = softwareSystem "Auth service" {
  description "The service that turns a ScoutID sign-in into the session."
  tags "service"
}

participantsService = softwareSystem "Participants service" {
  description "The service that serves the contingent's list of participants."
  tags "service"
}
