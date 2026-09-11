# 014. Build the web application on React with Vite

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every screen ships once, so the framework carries the browser, Android, and iOS alike ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). The team is two people and a large share of the code is written by agents, which makes review attention the scarce thing ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)) – an ecosystem an agent already knows deeply produces code that is quicker to read and correct. And the project may outlive the 2027 jamboree, handed to whoever runs the next one, so a framework a Swedish scouting volunteer can plausibly be found for matters more than one that wins a benchmark.

The deployed shape constrains the choice from the other side. The artifact is a static bundle on an origin whose back-end paths belong to an ingress ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), in front of services that are not ours to run. There is no Node process at the origin and no appetite for one, for screens that are all behind a sign-in. And the browser stays a first-class way in: the shells wrap the same application, so it has to install from a browser as a PWA on its own.

## Decision

We build the web application with React 19 and TypeScript, bundled by Vite, and ship it as a single-page application that installs as a PWA.

- **React, pinned exactly under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md), with no UI framework layered on top.** The components are Campfire's own, in `libraries/ui`.
- **Vite is the dev server and the bundler**, configured once in `config/vite/` under ADR 006's rule. The dev server holds port 3000 with `strictPort`, behind the local Caddy on 8000, because a port that quietly moved would read as the whole application being down.
- **The PWA is `vite-plugin-pwa`**, updating silently: a new deploy replaces the cached shell on the next visit, with no prompt.
- **No server rendering and no meta-framework.** The output is `index.html` plus assets, and every route is resolved in the browser.

## Consequences

- The first visit downloads the application before it can draw anything, and nothing here is indexable or shareable as a link preview. The service worker makes the download a one-time cost per deploy, and everything is behind a sign-in – the day the contingent wants a public page, that page lives somewhere else.
- A silent update means somebody mid-flow keeps the old shell until they navigate again. During camp, when a fix has to land in minutes, "on the next visit" may not be soon enough; a prompt or a forced reload is the obvious thing to add, and it is not built.
- React's ecosystem is the reason for the choice and also the bill: more dependencies to pin and age, and a `@types/react` to keep in step with `react` on every bump.
- The choice cascades. Routing, data loading, the module shape, and the component catalog are all decided on top of React, so reversing this is rewriting the front-end. Only the seam to the shells is untouched: `libraries/host` has no dependencies, not even React.

## Alternatives considered

- **Vue with Nuxt.** A smaller, calmer API and a first-class SPA mode. It loses on the two things that decide this: the agents writing much of this code are stronger on React, and the pool of people who could take Campfire over after 2027 is larger for React. Neither is a technical argument, and both are the real ones.
- **Svelte with SvelteKit.** The best developer experience of the three and the smallest bundles, with the same handover problem and a thinner ecosystem for the pieces this app leans on – an offline-first query cache with per-entry persistence first among them.
- **SolidJS.** React's model without React's reconciler, and faster. Too small a community for a project that has to be maintainable by whoever shows up in 2031.
- **Next.js, TanStack Start, or any framework with a server.** Server rendering and server functions would be real gains if there were a server. There is not, and adding one means a Node runtime in the image and a second thing to keep alive during camp. Taking a meta-framework for its SPA mode alone puts the front-end's whole shape behind one project's release cadence for none of its point.
- **Webpack or Rspack instead of Vite.** Vite is what React, Storybook, and Vitest already speak here, so anything else means configuring three tools twice.
