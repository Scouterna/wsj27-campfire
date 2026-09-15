# The system in scope: this repository. One box at context level, and twelve
# containers below it, grouped by what they are.
#
# The first container is the product as its users know it: one thing to a member, shipped
# three ways – as the web application in a browser, and as the two shells that host that
# same application on a phone. A person reaches the product, not one of the three, so
# each audience draws a single arrow and the diagram stays readable.
#
# A module is a container and so is a library, because that is what they are – separately
# versioned packages with their own boundary, assembled by the web application at build
# time. Folding them into one front-end container would hide the rule the whole front-end
# rests on: a module knows the libraries and never another module, and only the
# composition root knows every module.
#
# The model stops at the container level: what a container is made of is the code's own
# business, and the guidebook describes it in prose. Every relationship – between people,
# systems, and containers – is at the bottom of this file, flat and declared once at the
# level it is true, where both ends are already in scope.

campfire = softwareSystem "Campfire" {
  description "The Swedish contingent's digital companion for WSJ27."

  # The apps – what is deployed. One origin answers every path in every environment, so
  # the front-end never learns which environment it is running in; where that origin is
  # and what stands behind it is the deployment model's fact, in deployment.dsl.
  group "The apps" {

    campfireApp = container "Campfire app" {
      description "The product as a member knows it, one thing shipped three ways."
      technology "Web, Apple, Android"
      tags "product"
    }

    # The web application: the one front-end, and the only place that knows every module.
    # Its own source is small on purpose, and none of it is a feature. The features are
    # containers of their own, and this is what assembles them.
    webApp = container "Web app" {
      description "The application that holds every screen the contingent sees."
      technology "React 19, TypeScript, Vite"
    }

    # The Apple shell. Thin by rule: it draws the phone's chrome and nothing else, and
    # every word a user reads – bar the tab labels the web supplies and one failure
    # message – comes from the web application.
    appleShell = container "Apple shell" {
      description "The Apple app that hosts the application behind native chrome."
      technology "Swift 6, SwiftUI"
      tags "app"
    }

    # The Android shell. The same shape as the Apple one, in Kotlin – the two are kept at
    # parity on purpose, and each difference is a decision taken on that platform's terms
    # rather than drift.
    androidShell = container "Android shell" {
      description "The Android app that hosts the application behind native chrome."
      technology "Kotlin, Jetpack Compose"
      tags "app"
    }
  }

  # The modules – one domain capability each, and the reason the front-end can grow
  # without the composition root growing with it.
  group "The modules" {

    # The client half of the auth service's browser contract. The session is httpOnly
    # cookies, so nothing here ever holds a token – the module asks who is signed in and
    # is told, or is not.
    authenticationModule = container "Authentication" {
      description "The module that signs a member in and reads the session back."
      technology "TypeScript, React 19"
      tags "module"
    }

    # The smallest module, and deliberately so. It owns the start screen's layout, the
    # contingent's notices, and nothing else – the countdown and the unit widgets are
    # other modules', mounted through the widget registry, and every decision it draws
    # on is handed to it as a prop.
    homeModule = container "Home" {
      description "The module that owns the start screen and what it shows."
      technology "TypeScript, React 19"
      tags "module"
    }

    # The trip itself: the itinerary, the phase the contingent is in, and everything a
    # member wants to know about getting there and back – as widgets on the start screen
    # and as screens of its own.
    journeyModule = container "Journey" {
      description "The module that knows the trip, its phases, and the countdown."
      technology "TypeScript, React 19"
      tags "module"
    }

    # The contingent's register, and the largest module. It is the only one that talks
    # to the participants service, and the only one with a data layer – every field
    # arrives typed `unknown` and is validated at the boundary, because the service will
    # change shape over an eighteen-month build.
    participantsModule = container "Participants" {
      description "The module that owns the register and its screens."
      technology "TypeScript, React 19, TanStack Query"
      tags "module"
    }
  }

  # The libraries – generic, owned by no domain, and usable by every module. A library
  # that knows a feature is a feature module in the wrong place. They are modeled so the
  # rule that a module knows the libraries and never another module is written down,
  # and left off the container view on purpose: every module reaches all three, so
  # drawing them adds a fan of arrows and no fact about the product's shape.
  group "The libraries" {

    # The native bridge and the tier detection. No dependencies at all, not even React.
    hostLibrary = container "Host" {
      description "The library that detects a hosting shell and carries the bridge."
      technology "TypeScript"
      tags "module"
      properties {
        # Deliberately left off the container view – see the group above. Relaxed rather
        # than added to a view it does not belong on.
        structurizr.inspection.model.element.noview ignore
      }
    }

    # The design system: what a Row is, never what a participant is.
    uiLibrary = container "UI" {
      description "The design system, with its components, tokens, and themes."
      technology "TypeScript, React 19, CSS"
      tags "module"
      properties {
        # Deliberately left off the container view – see the group above. Relaxed rather
        # than added to a view it does not belong on.
        structurizr.inspection.model.element.noview ignore
      }
    }

    # One export so far, and the bar for the next is that a second package already wants it.
    utilsLibrary = container "Utils" {
      description "The library of small pure helpers every package may reach for."
      technology "TypeScript"
      tags "module"
      properties {
        # Deliberately left off the container view – see the group above. Relaxed rather
        # than added to a view it does not belong on.
        structurizr.inspection.model.element.noview ignore
      }
    }
  }

  # Development – ours, and it never ships.
  group "Development" {

    mock = container "Mock back-end" {
      description "The stand-in for both services on a developer's machine."
      technology "Node.js, Hono"
      tags "development"
      properties {
        # Deliberately left off the container view: it shows what the contingent's
        # application depends on, and the mock is a developer tool, never a runtime
        # dependency of anything shipped. Relaxed rather than added to a view it does
        # not belong on.
        structurizr.inspection.model.element.noview ignore
      }
    }
  }

  # Relationships. Each is a short verb phrase naming what the thing at one end does with
  # the thing at the other, declared once at the lowest level it is true. `this` is
  # Campfire.

  # People to the product. Everyone in the contingent reaches Campfire the same way, so
  # what the eight audiences do with it is one relationship each, worded as the outcome
  # they come for rather than as a feature. Each is drawn to the product, and the context
  # view rolls it up to the system on its own.
  leaders -> campfireApp "Follow their unit and the trip"
  cmtAdministration -> campfireApp "Follow the contingent's people and paperwork"
  cmtCommunication -> campfireApp "Follow who needs to be told what"
  cmtHealth -> campfireApp "Look up a participant's health and care"
  cmtIstSupport -> campfireApp "Follow the contingent's IST members"
  cmtProgram -> campfireApp "Follow the units and the program"
  cmtUnitSupport -> campfireApp "Follow the leader teams and their units"
  cmtHeadOfContingent -> campfireApp "Follow the contingent as a whole"
  developers -> this "Build and maintain"

  # The product to the three it ships as. The shells host the same application the
  # browser runs, so the web application is both a way the product ships and what the
  # shells embed.
  campfireApp -> webApp "Ships as, in a browser"
  campfireApp -> appleShell "Ships as"
  campfireApp -> androidShell "Ships as"

  # What Campfire depends on, at system level. Sign-in bounces through ScoutID on every
  # environment but local, and it is the app that sends the member there – the service
  # does the OpenID round trip once they arrive.
  this -> authService "Signs members in and out through"
  this -> participantsService "Reads the contingent's register from"
  this -> scoutid "Sends members to sign in at"
  authService -> scoutid "Runs the OpenID round trip with"
  # ScoutID fronts Scoutnet for identity: the sign-in is ScoutID's, the member behind it
  # is Scoutnet's.
  scoutid -> scoutnet "Verifies sign-ins against"
  participantsService -> scoutnet "Reads the contingent's member data from"
  developers -> github "Build, check, and publish through"

  # The developers meet the mock, which is the only container they run rather than use.
  developers -> mock "Run in place of both services, locally"

  # Container level – the mock, which answers the same paths the two services answer.
  mock -> authService "Stands in for, locally"
  mock -> participantsService "Stands in for, locally"

  # Container level – the shells. Each hosts the same application, opens a sign-in round
  # trip the main webview refuses to walk itself, and talks to the page over one
  # versioned channel.
  appleShell -> webApp "Hosts in one webview per tab"
  androidShell -> webApp "Hosts in one webview per tab"
  appleShell -> hostLibrary "Exchanges bridge messages with"
  androidShell -> hostLibrary "Exchanges bridge messages with"
  appleShell -> scoutid "Opens sign-in in a modal webview"
  androidShell -> scoutid "Opens sign-in in a modal sheet"

  # Container level – the application over the modules, and the modules over the
  # libraries. Only the web application knows every module; a module knows the libraries
  # and never another module, and each edge out of the front-end belongs to the one
  # module that owns it.
  webApp -> authenticationModule "Signs the member in through"
  webApp -> homeModule "Shows the start screen through"
  webApp -> journeyModule "Shows the trip through"
  webApp -> participantsModule "Shows the register through"
  webApp -> uiLibrary "Draws its chrome with"
  webApp -> hostLibrary "Reports the screen and the session through"
  authenticationModule -> uiLibrary "Builds its screens from"
  homeModule -> uiLibrary "Builds its screens from"
  journeyModule -> uiLibrary "Builds its screens from"
  participantsModule -> uiLibrary "Builds its screens from"
  authenticationModule -> utilsLibrary "Calls the service with"
  participantsModule -> utilsLibrary "Calls the service with"
  authenticationModule -> authService "Signs in and reads the session over /api/auth"
  authenticationModule -> participantsService "Reads the signed-in member's unit over /api/project"
  participantsModule -> participantsService "Reads the register over /api/project"
}
