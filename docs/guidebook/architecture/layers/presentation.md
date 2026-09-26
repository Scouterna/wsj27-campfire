# Presentation layer

The presentation layer is everything a person sees. A module's `ui/` holds three kinds of piece, each with one job:

| Piece      | Job                                                            |
| ---------- | -------------------------------------------------------------- |
| **Screen** | Answers at an address and renders what its hook hands it       |
| **Widget** | Appears on another module's screen, placed by id               |
| **Hook**   | Supplies the state – the query, the derivation, the formatting |

A screen does not fetch, validate, or know which environment it runs in. The split is what makes behavior testable without a browser: a hook can be exercised on its own, and a screen that formats nothing and decides nothing has little left worth a unit test. Screens are proven by walking them instead ([UI tests](../../testing/ui)).

## Screens

A screen is a React component, and the module's route table gives it an address ([Navigation and routing](./navigation)). It takes what it draws from a hook beside it and renders it.

A screen names itself by rendering `PageTitle`, and the chrome reads that for the bar and the document's title alike. The name belongs to the page because only the page knows it – a person's detail page learns its title once the data has arrived, and the list of participants is titled by whose list it is.

## Widgets

A widget lets one module's work appear on another module's screen without either importing the other. The providing module declares an id and exports a table filling it, the application merges the tables into one `WidgetsProvider`, and the receiving screen places the widget by id ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). The home screen places the journey's countdown and a leader's unit this way:

```tsx
<>
  {isUnitsRevealed && <Widget id="journey:countdown" />}
  {isUnitsRevealed && isLeader && <Widget id="participants:unit" />}
</>
```

The placing screen decides where a widget goes, who sees it, and from when, and never learns which module drew it. An id nobody filled renders nothing, which is what a story or a build without that module should do.

A widget takes no props. It reads what it needs where it is used – its own queries, or the session context – the way the countdown reads how the person travels with `useUser`. Nothing is threaded through the screen that places it.

## The session gate

Every screen sits behind the gate in the composition root, and its order matters:

1. Ask the auth service who is signed in, and render nothing until it answers – not a spinner, not the sign-in screen, because a sign-in screen flashing past a signed-in person reads as being signed out.
2. Hand the cache to that person before any screen mounts, so nobody reads the previous owner's data ([Data layer](./data)).
3. Show the sign-in screen, or mount the session's providers and branch once, on the tier, into the browser chrome or the shell chrome ([Applications](../applications)).

The gate keeps listening after boot ([ADR 033](/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate)). The authentication module holds the session as a store, and a read refused with 401 or an expiry the keep-alive did not renew both ask it again. What the answer means decides what the gate does:

| The answer                    | The gate                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Nobody is signed in           | Takes the application down, forgets the cache, and shows sign-in at the same address, so signing in returns there |
| Somebody else is signed in    | Reloads the page, and the boot order above adopts the new owner                                                   |
| The same person is signed in  | Nothing – the refused read is simply made again                                                                   |
| The service cannot be reached | Nothing – a lost signal is not a lost session                                                                     |

## Components and styling

The look belongs to the design system in `libraries/ui`. A module composes its components and never restyles them, and the design system knows what a row is but never what a participant is.

A component is a file named after it, with its stylesheet and its stories beside it in a directory of its own, and it takes one `props` object whose type is declared and exported beside it. Styling is plain CSS in cascade layers ([ADR 015](/decisions/015-style-the-web-application-with-plain-layered-css)), with raw values in tokens, every size following the reader's text size, and each unit color a theme swapped by name – [Design](../../design/) describes those foundations. Only a theme's name crosses [the bridge](./bridge), and each shell holds its own palette. Every word a user reads is Swedish ([ADR 011](/decisions/011-write-every-word-a-user-reads-in-swedish)).

## Stories

Every component, widget, and screen has stories beside it, and one Storybook catalogs the design system and the modules together ([ADR 023](/decisions/023-catalog-the-ui-in-storybook)). A story is rendered with the routing context a screen has, so anything that links renders outside the application, and dressed in the unit color picked in the toolbar. A story that needs data stubs it, because nothing in Storybook touches a network. [Design](../../design/#storybook) covers how the catalog is organized.
