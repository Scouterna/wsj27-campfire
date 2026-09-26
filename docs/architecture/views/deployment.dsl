# Each view hides the arrow from a shell to the web application. A shell embeds the
# application, but at run time it reaches it through the environment's one origin, so
# here the arrow would draw a path that does not exist.

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
