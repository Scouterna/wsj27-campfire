# The system in scope, which is this repository, with its containers grouped by what they
# are.
#
# The product is a container over the web application and the shells, because a person
# reaches the product rather than one of the ways it ships, and so each audience draws a
# single arrow.
#
# A module and a library are containers too, because each is a package of its own, and so
# the model holds the rule the front-end rests on – a module knows the libraries and
# never another module, and only the web application knows every module.
#
# Every relationship is at the bottom of this file, declared once at the lowest level it
# is true.

campfire = softwareSystem "Campfire" {
  description "The Swedish contingent's digital companion for WSJ27."

  group "The apps" {

    campfireApp = container "Campfire app" {
      description "The product as a member knows it, on the web or a phone."
      technology "Web, Apple, Android"
      tags "product"
    }

    webApp = container "Web app" {
      description "The composition root that holds every screen and knows every module."
      technology "React 19, TypeScript, Vite"
    }

    # The shells are twins, kept at parity on purpose, so a difference between them is a
    # decision taken on one platform's terms rather than drift.
    appleShell = container "Apple shell" {
      description "The iPhone app that hosts the web application behind native chrome."
      technology "Swift 6, SwiftUI"
      tags "app"
    }

    androidShell = container "Android shell" {
      description "The Android app that hosts the web application behind native chrome."
      technology "Kotlin, Jetpack Compose"
      tags "app"
    }
  }

  group "The modules" {

    authenticationModule = container "Authentication" {
      description "The client half of the auth service, and the keeper of the session."
      technology "TypeScript, React 19"
      tags "module"
    }

    homeModule = container "Home" {
      description "The start screen, and what it shows to whom and from when."
      technology "TypeScript, React 19"
      tags "module"
    }

    journeyModule = container "Journey" {
      description "The trip from departure to the way home, and its countdown."
      technology "TypeScript, React 19"
      tags "module"
    }

    participantsModule = container "Participants" {
      description "The contingent's list of participants and the screens that show it."
      technology "TypeScript, React 19, TanStack Query"
      tags "module"
    }
  }

  # The libraries are modeled so the module rule is written down, and left off the
  # container view for the reason given there.
  group "The libraries" {

    hostLibrary = container "Host" {
      description "The detection of the hosting tier, and the web half of the bridge."
      technology "TypeScript"
      tags "module"
      properties {
        structurizr.inspection.model.element.noview ignore
      }
    }

    uiLibrary = container "UI" {
      description "The design system, knowing what a row is but never a participant."
      technology "TypeScript, React 19, CSS"
      tags "module"
      properties {
        structurizr.inspection.model.element.noview ignore
      }
    }

    utilsLibrary = container "Utils" {
      description "Small shared helpers, and the session every module may read."
      technology "TypeScript"
      tags "module"
      properties {
        structurizr.inspection.model.element.noview ignore
      }
    }
  }

  group "Development" {

    mock = container "Mock back-end" {
      description "The stand-in for the back-end services on a developer's machine."
      technology "Node.js, Hono"
      tags "development"
      properties {
        # Left off the container view for the reason given there.
        structurizr.inspection.model.element.noview ignore
      }
    }
  }

  # In the relationships below, `this` is Campfire.

  # Each audience is drawn to the product, and the context view rolls the arrow up to the
  # system on its own.
  leaders -> campfireApp "Know and reach their unit"
  cmtAdministration -> campfireApp "Look up and reach anyone"
  cmtCommunication -> campfireApp "Reach the people a message is for"
  cmtHealth -> campfireApp "Read a participant's health answers"
  cmtIstSupport -> campfireApp "See and reach the IST"
  cmtProgram -> campfireApp "Plan around the units and leaders"
  cmtUnitSupport -> campfireApp "Follow the units and answer members"
  cmtHeadOfContingent -> campfireApp "See the whole contingent at a glance"
  developers -> this "Build and maintain"

  campfireApp -> webApp "Ships as, in a browser"
  campfireApp -> appleShell "Ships as"
  campfireApp -> androidShell "Ships as"

  # It is the app that sends a member to ScoutID, and the auth service that completes the
  # round trip once they arrive.
  this -> authService "Signs members in and out through"
  this -> participantsService "Reads the contingent's list of participants from"
  this -> scoutid "Sends members to sign in at"
  authService -> scoutid "Runs the OpenID round trip with"
  scoutid -> scoutnet "Verifies sign-ins against"
  participantsService -> scoutnet "Reads the contingent's member data from"
  developers -> github "Build, check, and publish through"

  developers -> mock "Run in place of both services, locally"
  mock -> authService "Stands in for, locally"
  mock -> participantsService "Stands in for, locally"

  # A shell opens sign-in in a modal, because the main webview refuses to walk the round
  # trip itself.
  appleShell -> webApp "Hosts in one webview per tab"
  androidShell -> webApp "Hosts in one webview per tab"
  appleShell -> hostLibrary "Exchanges bridge messages with"
  androidShell -> hostLibrary "Exchanges bridge messages with"
  appleShell -> scoutid "Opens sign-in in a modal webview"
  androidShell -> scoutid "Opens sign-in in a modal sheet"

  # An edge from the front-end to a service starts at the module that owns it.
  webApp -> authenticationModule "Signs the member in through"
  webApp -> homeModule "Shows the start screen through"
  webApp -> journeyModule "Shows the countdown through"
  webApp -> participantsModule "Shows the list of participants through"
  webApp -> uiLibrary "Draws its chrome with"
  webApp -> hostLibrary "Reports the screen and the session through"
  authenticationModule -> uiLibrary "Builds its screens from"
  homeModule -> uiLibrary "Builds its screens from"
  journeyModule -> uiLibrary "Builds its widget from"
  participantsModule -> uiLibrary "Builds its screens from"
  webApp -> utilsLibrary "Mounts the session through"
  authenticationModule -> utilsLibrary "Calls the service with"
  homeModule -> utilsLibrary "Reads the session's roles from"
  journeyModule -> utilsLibrary "Reads the signed-in person from"
  participantsModule -> utilsLibrary "Calls the service with"
  authenticationModule -> authService "Signs in and reads the session over /api/auth"
  authenticationModule -> participantsService "Reads the member's unit and travel over /api/project"
  participantsModule -> participantsService "Reads the list of participants over /api/project"
}
