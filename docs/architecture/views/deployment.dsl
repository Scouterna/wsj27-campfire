# One deployment view per environment, each with its own stable, human-authored key.
# The environment names are the three `pnpm start:` stacks carry, and the views show
# where each one runs and what stands behind its one origin.
#
# No view carries an `autolayout` line: every diagram is hand-arranged, and the positions
# live in workspace.json. Arrange them in `pnpm start:arch`.
#
# Each view hides the arrow from a shell to the web application. That arrow is the
# container level's fact – a shell embeds the application – and here it would draw a
# path that does not exist: a shell reaches the application through the environment's
# one origin, and the origin is what these views are about.

deployment campfire "Local" "deploymentLocal" {
  include *
  exclude appleShell->webApp
  exclude androidShell->webApp
  description "The local environment, with the mock behind Caddy on a developer's machine."
}

deployment campfire "Dev" "deploymentDev" {
  include *
  exclude appleShell->webApp
  exclude androidShell->webApp
  description "The dev environment, with the real services behind an ingress in Azure."
}

deployment campfire "Prod" "deploymentProd" {
  include *
  exclude appleShell->webApp
  exclude androidShell->webApp
  description "The production environment, with the real services behind an ingress in Azure."
}
