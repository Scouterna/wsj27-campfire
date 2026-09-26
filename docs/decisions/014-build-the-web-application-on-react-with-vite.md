# 014. Build the web application on React with Vite

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every screen ships once, so the framework carries the browser, Android, and iOS alike ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). React is the standard choice, Scouterna already builds many of its projects with it, and agents write it well – so the people most likely to maintain Campfire later already know it.

The artifact is a static bundle on an origin whose back-end paths belong to an ingress ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)). Every screen is behind a sign-in, and the application also installs from a browser on its own.

## Decision

We build the web application with React and TypeScript, bundled by Vite, and ship it as a single-page application that installs as a PWA.

- **React, with no UI framework on top.** The components are Campfire's own, in `libraries/ui`.
- **Vite is the dev server and the bundler**, configured once in `config/vite/`. The dev server holds port 3000 with `strictPort`, because a port that quietly moved would read as the application being down.
- **The PWA is `vite-plugin-pwa`**, updating silently – a new deploy reloads an open page onto itself, with no prompt.
- **No server rendering and no meta-framework.** There is no server to run one, and the output is `index.html` plus assets, with every route resolved in the browser.

## Consequences

- The first visit downloads the application before drawing anything, and nothing is indexable. The service worker makes the download a one-time cost per deploy, and a public page, if one is ever wanted, lives elsewhere.
- React's ecosystem is the reason and the bill – more dependencies to pin and age.
- Routing, data loading, the module shape, and the component catalog are all decided on top of React, so reversing this is rewriting the front-end. Only `libraries/host`, the seam to the shells, has no dependency on React.
