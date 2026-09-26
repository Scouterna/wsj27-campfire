# The environments differ in what sits behind the one origin – the mock on a developer's
# machine, or the real services in containers behind an ingress.

deploymentEnvironment "Local" {

  deploymentNode "Developer's machine" {
    description "The machine that runs the whole local environment."
    technology "macOS"

    localCaddy = infrastructureNode "Caddy" {
      description "The front door and the one origin, on port 8000."
      technology "Caddy"
    }

    deploymentNode "Vite" {
      description "The web application's dev server, on port 3000."
      technology "Node.js 24, Vite"
      localWeb = containerInstance webApp
    }

    deploymentNode "Node.js" {
      description "The mock's own process, on port 8003."
      technology "Node.js 24"
      localMock = containerInstance mock
    }

    deploymentNode "iOS Simulator" {
      description "The simulator that runs the Apple shell against localhost."
      technology "Xcode"
      localApple = containerInstance appleShell
    }

    deploymentNode "Android emulator" {
      description "The emulator that reaches the host's port 8000 through adb reverse."
      technology "Android SDK"
      localAndroid = containerInstance androidShell
    }

    localCaddy -> localWeb "Proxies every other path to"
    localCaddy -> localMock "Proxies /api/auth and /api/project to"
    localApple -> localCaddy "Loads the application from"
    localAndroid -> localCaddy "Loads the application from"
  }
}

deploymentEnvironment "Dev" {

  deploymentNode "Azure" {
    description "The cloud that hosts the dev site at campfire.wsj27.scouterna.net."
    technology "Microsoft Azure"

    deploymentNode "Kubernetes cluster" {
      description "Scouterna's cluster, running the web image beside the back-end services."
      technology "Kubernetes"

      devIngress = infrastructureNode "Ingress" {
        description "The one origin over HTTPS, the deployed form of the front door."
        technology "Kubernetes ingress"
      }

      deploymentNode "Web" {
        description "The published web image, serving the built application."
        technology "Caddy 2, container"
        devWeb = containerInstance webApp
      }

      deploymentNode "Auth service" {
        description "The auth service's own container, built from its repository."
        technology "Python, container"
        devAuth = softwareSystemInstance authService
      }

      deploymentNode "Participants service" {
        description "The participants service's own container, built from its repository."
        technology "Python, container"
        devProject = softwareSystemInstance participantsService
      }

      devIngress -> devWeb "Routes every other path to"
      devIngress -> devAuth "Routes /api/auth to"
      devIngress -> devProject "Routes /api/project to"
    }
  }

  deploymentNode "Member's phone" {
    description "A leader's or a CMT member's own phone."
    technology "iOS 26 or Android"
    devApple = containerInstance appleShell
    devAndroid = containerInstance androidShell
  }

  deploymentNode "Scouterna" {
    description "Scouterna's own systems, with ScoutID's dev realm."
    technology "Keycloak, Scoutnet"
    softwareSystemInstance scoutid
    softwareSystemInstance scoutnet
  }

  devApple -> devIngress "Loads the application from"
  devAndroid -> devIngress "Loads the application from"
}

deploymentEnvironment "Prod" {

  deploymentNode "Azure" {
    description "The cloud that hosts the prod site at campfire.wsj27.se."
    technology "Microsoft Azure"

    deploymentNode "Kubernetes cluster" {
      description "Scouterna's cluster, running the web image beside the back-end services."
      technology "Kubernetes"

      prodIngress = infrastructureNode "Ingress" {
        description "The one origin over HTTPS, the deployed form of the front door."
        technology "Kubernetes ingress"
      }

      deploymentNode "Web" {
        description "The published web image, serving the built application."
        technology "Caddy 2, container"
        prodWeb = containerInstance webApp
      }

      deploymentNode "Auth service" {
        description "The auth service's own container, built from its repository."
        technology "Python, container"
        prodAuth = softwareSystemInstance authService
      }

      deploymentNode "Participants service" {
        description "The participants service's own container, built from its repository."
        technology "Python, container"
        prodProject = softwareSystemInstance participantsService
      }

      prodIngress -> prodWeb "Routes every other path to"
      prodIngress -> prodAuth "Routes /api/auth to"
      prodIngress -> prodProject "Routes /api/project to"
    }
  }

  deploymentNode "Member's phone" {
    description "A leader's or a CMT member's own phone."
    technology "iOS 26 or Android"
    prodApple = containerInstance appleShell
    prodAndroid = containerInstance androidShell
  }

  deploymentNode "Scouterna" {
    description "Scouterna's own systems, with ScoutID's production realm."
    technology "Keycloak, Scoutnet"
    softwareSystemInstance scoutid
    softwareSystemInstance scoutnet
  }

  prodApple -> prodIngress "Loads the application from"
  prodAndroid -> prodIngress "Loads the application from"
}
