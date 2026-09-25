import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// The version this build is, handed in by whoever runs it rather than read from the tree:
// the release workflow passes the version it is releasing. A build given none –
// locally, `pnpm build:image`, a push that earns no release – is 0.0.0, which no release
// ever carries. Checked here, at load, so a malformed value fails the dev server and the
// build alike before either does any work. Leading zeros are refused, as the release rule
// in scripts/release/ refuses them, so both agree on what a version is.
const given = process.env["CAMPFIRE_VERSION"]
// An empty value counts as none, since a CI variable that was never set arrives as "".
const version = given === undefined || given === "" ? "0.0.0" : given
if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version)) {
  throw new Error(
    `CAMPFIRE_VERSION must be three dot-separated numbers without leading zeros, such as 2026.9.0 – got "${version}".`,
  )
}

/**
 * Writes the build's version into the page head as a `campfire-version` meta tag.
 * @returns The plugin that adds the tag to `index.html`.
 */
function campfireVersion(): Plugin {
  return {
    name: "campfire-version",
    // A meta tag rather than a global: nothing in the application reads the version, so
    // it stays out of the bundle, and a person in the browser's console or a Playwright
    // walk can still read which version a running build is.
    transformIndexHtml: () => [
      { tag: "meta", attrs: { name: "campfire-version", content: version }, injectTo: "head" },
    ],
  }
}

// Vite's configuration, kept in config/ with every other tool's rather than in the app
// that uses it (ADR 006). Vite resolves `root` from the working directory rather than
// from this file's location, so `index.html`, `src/`, and `build.outDir` below all stay
// relative to whichever app was started – which is what lets one file serve them all.
export default defineConfig({
  // Vite's default is "public" – named "assets" here instead, so a favicon or an
  // icon that never passes through the bundler still reads as project vocabulary
  // rather than a framework convention.
  publicDir: "assets",

  plugins: [
    react(),
    campfireVersion(),

    // The PWA: a manifest so Campfire installs from the browser, and a generated
    // service worker that precaches the built shell. The cache is what makes a
    // back-forward navigation that misses the bfcache reload instantly instead of
    // refetching, and what keeps the app opening with no network at all.
    VitePWA({
      // A new deploy replaces the cached shell on the next visit, with no prompt.
      registerType: "autoUpdate",

      // Registered by an injected script rather than a virtual module import, so tsc
      // never has to resolve a module that only Vite knows about.
      injectRegister: "script-defer",

      workbox: {
        // Stated because the plugin does not derive them from `registerType` here: without
        // them the generated worker only skips waiting on a SKIP_WAITING message nothing
        // sends, and a deploy waits until every tab is closed. With them a new worker takes
        // over as soon as it installs, which fires the `controllerchange` the application's
        // own update wiring answers with one reload.
        clientsClaim: true,
        skipWaiting: true,

        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // The worker answers every navigation with the precached shell, which is right
        // for a screen and wrong for anything else the ingress serves on this origin:
        // sign-in and sign-out are full-page navigations to /api/auth, and the CMS lives
        // under /_services/cms. A shell served in their place means they work only until
        // the worker is installed – on a browser's very first visit, and never again.
        navigateFallbackDenylist: [/^\/_services\//, /^\/api\//, /^\/services\//],
      },

      manifest: {
        name: "Campfire",
        short_name: "Campfire",
        description:
          "Digitalt hem för ledarna och kontingentledningen i Sveriges kontingent till WSJ27 i Polen.",
        lang: "sv",
        // The identity, the entry, and the boundary, stated rather than inferred. An
        // absent `id` defaults to `start_url`, so moving the entry later would read as
        // a different app and leave a second install behind; an absent `scope` defaults
        // to the entry's directory, which is right here and says nothing.
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#215262",
        // The same paper as `body` in app.css and the shells' Palette.paper, so the
        // splash an installed PWA shows before first paint continues the page.
        background_color: "#f4f2ec",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
    }),
  ],

  build: {
    // Inside the app, not at the repository root: every app builds into its own .build/
    // so that its own `clean` script can remove its own output without reaching upward.
    // The root .build/ belongs to the guidebook.
    outDir: ".build",
    emptyOutDir: true,
  },

  server: {
    // Every interface, IPv4 included, so all three hosts can reach the server: a browser
    // via 127.0.0.1, the Android emulator via 10.0.2.2 (an alias for the host's IPv4
    // loopback), and a real phone via the machine's LAN address. The cost is that the
    // server is visible on the local network while it runs.
    host: true,

    // Written down rather than left to Vite's default, which VitePress shares: the
    // guidebook would take 5173 first and this server would then fail outright, because
    // strictPort below refuses to move. The dev servers sit together – the web on 3000,
    // the guidebook on 3001, and Storybook on 3002.
    port: 3000,

    // The local Caddy on 8000 – the one origin the browser and the shells use – proxies
    // here, and a port that quietly shifted would read as the whole app being down.
    // Routing /api/auth and the rest of the back-end is Caddy's job, not a proxy here: this
    // server serves the application and nothing else.
    strictPort: true,
  },

  resolve: {
    // A workspace library is a symlink, so React resolved from inside one can be a
    // different copy from React resolved by the app. Two copies of React is the class of
    // bug that shows up as hooks failing for no visible reason.
    dedupe: ["react", "react-dom"],
  },
})
