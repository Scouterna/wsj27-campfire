# Navigation and routing

Navigation sits in no single layer. A module owns the addresses it answers at, the design system owns the machinery that mounts them, and the application owns the table that results – so routing gets a page of its own.

## Routes are data

The router is TanStack Router ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)), and routes are declared as data, not as files. Each module exports a plain table of address to screen, and each entry says three things:

| Field       | Means                                                      |
| ----------- | ---------------------------------------------------------- |
| `Component` | What renders at this address                               |
| `tab`       | Which section lights up, by the id the menus use           |
| `parent`    | The address back leads to, if this screen has one above it |

The table places a screen; it does not name one. A page declares what it is called by rendering `PageTitle`, because the page is the one thing that knows its own name – a title that depends on who is reading, as the participants screen's does, cannot be written in a static table. The chrome reads the declaration for the bar and for the document's title alike.

The application merges the modules' tables into one, and a helper in `libraries/ui` turns the merged table into routes under a single root. It returns a record keyed by path rather than an array, and that is the whole trick: an array collapses the routes into one union type and the router can no longer tell which address takes a parameter, while keyed by path each route keeps its own literal type and every link stays checked down to that detail.

A module's own table is written with `satisfies` rather than a type annotation. Annotating widens the keys to every address the application knows, and the router stops knowing which ones this module actually answers at – a mistake whose type error appears somewhere else entirely.

## The URL space is one namespace, owned in pieces

A URL space is flat, so it has to be described by one type – which is not the same as one module owning it. `RouteRegistry` is an empty interface in `libraries/ui` that each module augments from its own source:

```ts
declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    "/participants": Address<"participants">
    "/participants/$memberNo": Address<"participants">
    "/participants/units": Address<"participants">
    "/participants/units/$unit": Address<"participants">
  }
}
```

The brand is what makes a clash visible. Interface merging accepts a property declared twice with the same type, so a bare marker would let two modules quietly claim one address and the later import would win at runtime. Branding the entry with its owner makes the second declaration a different type, which is a compile error.

One address is the application's own: the start screen at `/`, because home is the one address that belongs to no single module.

Registration is invisible machinery, and it is worth saying out loud: an address exists only because some module augmented an interface, and a module whose entry point is never imported registers nothing at all. It is the application depending on the package that turns it on.

## Sections, and what an address answers

A section is a top-level destination the menus offer, and the sections are the application's model rather than any module's: home for everyone, and the participants section for a leader and for any contingent management function. The application derives them from the session's roles – and from the reveals, so the participants section stays out of every menu until the units reveal opens – which is why a screen's table entry names a section by id and never decides who may see it.

One predicate settles that for everything. `isGranted` maps a screen's `tab` to the section that owns it and asks whether the roles grant it, and the same call feeds three places, so they cannot drift apart:

- The side menu and the tab bar list the sections it grants, so everything a menu offers is something the person can open.
- The chrome resolves the marked section, the title, and the back control through it.
- The screen guard mounts the real component through it, and the not-found page otherwise.

It fails closed: a screen whose `tab` names no section is granted to nobody, so a typo hides a screen loudly rather than publishing it to everyone.

The guard is what makes an address honest. An address matching no screen and an address matching a screen outside the person's sections show the same not-found page, so the application never reveals what exists for other roles – the hidden screen never mounts, runs no effect, fires no query, and never names itself, which is what keeps the two indistinguishable down to the document's title.

## Back, and what it means

`canGoBack` is derived from the declared `parent`, never from `history.length`. History counts navigations and lies after a cold deep link or a restored tab; a back control has to mean "up one screen" whether the person arrived by link, by tab, or by reopening the app. A screen with no parent is a section root and offers no back at all.

Going back is a history pop rather than a link to the parent, so a page returns to where it was left – except on a cold deep link, where there is no history to pop and the parent is navigated to instead.

## Moving between screens

Every navigation is a view transition. Direction is not something a router knows, so the application decides it in one capture-phase click listener and writes it onto the document, where the stylesheet reads it: a side-menu or tab click cross-fades, everything else slides forward, and an unexpected history pop – the browser's back button, or an edge swipe – disarms the transition entirely, because the platform already animated the move.

## Inside a shell

The native bars are the navigation surface, so the address bar has a second half ([Applications](../applications)).

Each tab is its own webview with its own history, and the shell owns the tab bar. Four of the five messages a shell sends are about moving between screens – the fifth, `action`, reports a toolbar or menu item being tapped ([Applications](../applications)):

- **`back`** pops the webview's history, and says whether the web should animate – the shell's own interactive swipe already is the animation.
- **`forward`** restores what a canceled back swipe popped.
- **`popToRoot`** is the active tab tapped again: a scrolled page settles to its top, and a page already at the top pops the tab's whole history in one step.
- **`open`** is a native control asking for an address, such as the profile button, and is treated as a push like any tapped link.

The web reports the other direction – the screen's title, whether back applies, and the session's tabs – so the bars are drawn natively from what the web already knows. Nothing about a route is duplicated in a shell.

## Widgets travel as props

Widgets cross module boundaries one level down from routes, but as values rather than registrations: the providing module exports the widget, and the composition root places it in a slot the receiving screen offers – a `ReactNode` prop, so the screen never learns which module filled it ([Presentation layer](./presentation)). With two widgets in the product, one prop per slot carries them; a `WidgetRegistry` of id-keyed tables is the design to grow into when placing by hand stops scaling.
