# Navigation and routing

Navigation belongs to no single layer. A module owns the addresses it answers at, the design system owns the machinery that mounts them, and the application owns the merged table and who may open what.

## Routes are data

Routing is TanStack Router ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)), with routes declared as tables rather than as files. Each module exports a table from address to screen, and each entry says:

| Field            | Means                                             |
| ---------------- | ------------------------------------------------- |
| `Component`      | What renders at the address                       |
| `tab`            | The section the screen belongs to                 |
| `parent`         | Where back leads, for a screen with one above it  |
| `validateSearch` | The state the screen keeps in the address, if any |

The table places a screen and does not name it. The page names itself with `PageTitle`, because a title can depend on who is reading, and a static table cannot know that ([Presentation layer](./presentation)).

The application merges the modules' tables, and `libraries/ui` mounts them under one root, keyed by path rather than as a list. Keyed by path, each route keeps its own type, so every link in the application is checked by the compiler down to its parameters – a link to a person's page that forgets the member number does not build.

## One URL space, owned in pieces

A URL space is one flat namespace, so it is described by one type – which is not the same as one module owning it. `RouteRegistry` is an empty interface in `libraries/ui` that each module fills from its own source:

```ts
declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    "/participants": Address<"participants">
    "/participants/$memberNo": Address<"participants">
  }
}
```

Each entry is branded with the module that owns it, so two modules claiming one address is a compile error rather than a silent win for whichever loads last. The library never learns which modules exist. The start screen at `/` is the application's own, because home is the one address that is no single module's.

Registration is invisible machinery: an address exists only because a module declared it, and a module the application never imports registers nothing ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)).

## Sections decide who opens what

A section is a top-level destination in the menus – home for everyone, and the participants section for leaders and the contingent management team once the units reveal has opened. Sections are the application's, derived from the session's roles and the reveals, so a screen names the section it belongs to and never decides who may see it.

One predicate grants a section, and everything that needs the answer asks it, so they cannot drift apart:

- The side menu and the tab bar list the granted sections, so everything a menu offers is something the person can open.
- The chrome marks the current section and offers back only on a granted screen.
- A guard around every screen mounts the screen, or the not-found page.

It fails closed: a screen naming no known section is granted to nobody, so a typo hides a screen loudly rather than publishing it to everyone.

The guard is what keeps an address honest. An address outside the person's sections shows the same not-found page as one that matches nothing, and the hidden screen never mounts – it runs no effect, fires no query, and never names itself – so the application never reveals what exists for other roles. The section only decides what is offered; the back-end still decides what may be read.

## Back and transitions

Back leads to the declared `parent`, never to whatever `history.length` suggests, because history lies after a deep link or a restored tab, and a back control has to mean "up one screen" however the person arrived. A screen with no parent is a section root and offers no back.

Going back pops history, so a page returns to where it was left, scrolled as it was. On a cold deep link there is no history to pop, so the parent is navigated to instead.

Every navigation is a view transition. The router does not know direction, so one click listener decides it before the router acts: a menu or tab click cross-fades between sections, anything else slides forward, and a history pop the application did not ask for – the browser's back button or an edge swipe – runs no transition, because the platform already animated the move.

## Inside a shell

In a shell, the native bars are the navigation ([Applications](../applications)). Each tab is its own webview with its own history, and the shell owns the tab bar.

The web reports the title, whether back applies, and the session's tabs, so the bars are drawn natively from what the web already knows. The shell reports back what the person did:

- **A back gesture** pops the webview's history, and says whether the shell's own swipe already animated it.
- **A canceled back swipe** restores what it popped.
- **The active tab tapped again** scrolls the page to its top, and a page already at the top returns to the tab's first screen.
- **A native control asking for an address**, such as the profile button, opens it like any tapped link.

Nothing about a route is duplicated in a shell. [The bridge](./bridge) has the messages.
