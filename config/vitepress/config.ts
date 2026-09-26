import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitepress"
import { withMermaid } from "vitepress-plugin-mermaid"

// The agent definitions in the reading order the Process chapter lists them in,
// which is the order work moves through them rather than alphabetical. Adding an
// agent means adding it here and to that chapter's table.
const agents = ["analyst", "architect", "developer", "reviewer"]

// A page's title for the sidebar – its H1, which every guidebook page and record
// carries on its first line, minus the marker. One reader for every list built
// from disk, so a change to how a title is derived lands once.
const titleOf = (path: string): string =>
  readFileSync(path, "utf8").split("\n", 1)[0]?.replace(/^#\s*/, "") ?? ""

// The ADRs, in number order, read from disk at config load. Their filenames
// carry the number, so sorting the directory is the reading order, and a new
// record joins the chain by existing. The number pattern also skips the index
// and the template, which have none.
const decisionsDirectory = fileURLToPath(new URL("../../docs/decisions", import.meta.url))

const decisions = readdirSync(decisionsDirectory)
  .filter((file) => /^\d{3}-.+\.md$/.test(file))
  // The numbers are zero-padded, so ordering the names orders the records.
  .toSorted((a, b) => a.localeCompare(b))
  .map((file) => ({
    slug: file.replace(/\.md$/, ""),
    // The H1, minus its marker: "001. Record architecture decisions".
    text: titleOf(`${decisionsDirectory}/${file}`),
  }))

const processChapter = { text: "Process", link: "/process/" }
const decisionsChapter = { text: "Decisions", link: "/decisions/" }

const agentLink = (name: string): { text: string; link: string } => ({
  text: name.charAt(0).toUpperCase() + name.slice(1),
  link: `/agents/${name}`,
})

const decisionLink = (decision: {
  slug: string
  text: string
}): { text: string; link: string } => ({
  text: decision.text,
  link: `/decisions/${decision.slug}`,
})

// The entries on either side of one in a reading order – neither, when it is not in the
// list at all. Both prev/next chains read their neighbors through this.
const neighbors = <T>(
  list: readonly T[],
  index: number,
): { readonly after?: T | undefined; readonly before?: T | undefined } =>
  index === -1 ? {} : { after: list[index + 1], before: list[index - 1] }

// A chapter's sub-pages, in reading order. They are surfaced in the sidebar so
// each part is reachable from the menu, and their titles are read from each
// page's H1 – so a renamed page needs no edit here, and VitePress derives
// their prev/next from this order. The slug list is the one thing a new page
// adds to this file.
const guidebookRoot = fileURLToPath(new URL("../../docs/guidebook", import.meta.url))

const chapterPages = (chapter: string, slugs: string[]): { text: string; link: string }[] =>
  slugs.map((slug) => ({
    text: titleOf(`${guidebookRoot}/${chapter}/${slug}.md`),
    link: `/${chapter}/${slug}`,
  }))

// The Context chapter's sub-pages – one per person, then one per external
// system, in the order the chapter's tables list them – grouped into People
// and Systems in the sidebar.
const contextPeople = chapterPages("context/people", [
  "leaders",
  "cmt-administration",
  "cmt-communication",
  "cmt-health",
  "cmt-ist-support",
  "cmt-program",
  "cmt-unit-support",
  "cmt-head-of-contingent",
  "developers",
])

const contextSystems = chapterPages("context/systems", [
  "auth-service",
  "participants-service",
  "scoutid",
  "scoutnet",
])

const requirementsPages = chapterPages("requirements", ["scope", "constraints", "quality"])

const architecturePages = chapterPages("architecture", [
  "code-organization",
  "applications",
  "modules",
])

// The Layers group – the layers plus the navigation and the bridge that cut
// across them – nested under Architecture, with its own overview page as the
// group's link.
const layerPages = chapterPages("architecture/layers", [
  "domain",
  "data",
  "presentation",
  "navigation",
  "bridge",
])

const exampleFlowPages = chapterPages("architecture/example-flows", [
  "sign-in",
  "show-participants",
])

const developmentPages = chapterPages("development", [
  "setup",
  "layout",
  "environments",
  "scripts",
  "checks",
  "continuous-integration",
  "conventions",
])

const testingPages = chapterPages("testing", ["mock", "unit", "ui"])

const maintenancePages = chapterPages("maintenance", ["release", "monitoring"])

// The substantive VitePress configuration for the WSJ27 Campfire guidebook.
// VitePress mandates its config at docs/.vitepress/config.ts, which re-exports
// this file so all real configuration lives under config/ with the other
// shared tooling. The site is rooted at docs/ so it renders both the guidebook
// chapters (docs/guidebook/**, promoted to the root by the rewrite below) and
// the ADR log (docs/decisions/, served at /decisions/).
const config = withMermaid(
  defineConfig({
    title: "Campfire",
    description:
      "The software guidebook for WSJ27 Campfire – the digital companion for the leaders and contingent management team of Scouterna's Swedish contingent to the World Scout Jamboree 2027.",

    // The same app icon as apps/web, in the official red rather than the app's
    // tonal blue – the guidebook is the contingent's own document, not the
    // installable app – copied by hand into config/vitepress/assets/ (nothing
    // keeps the two palettes in step). The ICO is the fallback (its `sizes`
    // keeps Chrome from preferring it over the SVG), the SVG is the scalable
    // icon and swaps to the dark-mode palette itself, and the PNG is for iOS
    // home screens. VitePress applies no base prefix to `head` hrefs, so each
    // path carries the subpath itself.
    head: [
      ["link", { rel: "icon", href: "/wsj27-campfire/favicon.ico", sizes: "32x32" }],
      ["link", { rel: "icon", href: "/wsj27-campfire/icon.svg", type: "image/svg+xml" }],
      ["link", { rel: "apple-touch-icon", href: "/wsj27-campfire/apple-touch-icon.png" }],
    ],

    cleanUrls: true,
    outDir: "../.build/docs",
    cacheDir: "../.build/cache",

    // The guidebook publishes to the default GitHub Pages URL for this
    // repository, https://scouterna.github.io/wsj27-campfire/, so every asset
    // and link is resolved from that subpath rather than the domain root. Only
    // the repository name appears here, so moving the repository between owners
    // leaves this alone; renaming it changes this value and every published
    // link with it, and a custom domain would make it "/" again.
    base: "/wsj27-campfire/",

    // Promote the whole docs/guidebook/** subtree to the site root, so the
    // Introduction serves at / and each chapter folder serves at /<chapter>/.
    // VitePress compiles rewrites with path-to-regexp, which accepts :param /
    // :param* splat syntax, not raw regex.
    rewrites: {
      "guidebook/:rest*": ":rest*",
    },

    // The ADR template is authoring scaffolding, not a chapter, so it is kept
    // out of the build; docs/decisions/index.md references it as inline code,
    // never as an internal page link. docs/architecture/ is the C4 model – the
    // DSL, its authoring guide, and the exported diagrams – and only the SVGs
    // belong on the site, which they reach as assets the chapters embed rather
    // than as pages of their own. Patterns match the source path before the
    // rewrite above, so "architecture/**" is the model directory, not the
    // Architecture chapter at guidebook/architecture/. Every AGENTS.md under
    // docs/, and the CLAUDE.md symlink beside it, is authoring conventions
    // rather than a chapter, so a glob excludes them wherever they sit.
    srcExclude: ["decisions/template.md", "architecture/**", "**/AGENTS.md", "**/CLAUDE.md"],

    // Prev/next links come from the sidebar order. The individual ADRs and the
    // agent definitions are deliberately not in the sidebar – they hang off the
    // table in their chapter instead – so VitePress finds no neighbors and
    // falls back to the first entry, offering "Next: Introduction" from the
    // middle of an ADR. Give them their own neighbors instead.
    transformPageData(pageData) {
      const { relativePath, frontmatter } = pageData

      // The agents read as a set, so they chain: out of the Process chapter,
      // through them in order, and back to it from the last one. `relativePath`
      // is the path after the guidebook/** rewrite, so it is `agents/…` even
      // though the file lives at docs/guidebook/agents/.
      if (relativePath.startsWith("agents/")) {
        const name = relativePath.slice("agents/".length).replace(/\.md$/, "")
        const { after, before } = neighbors(agents, agents.indexOf(name))

        frontmatter["prev"] = before ? agentLink(before) : processChapter
        frontmatter["next"] = after ? agentLink(after) : processChapter
        return
      }

      // The ADRs chain in number order, the way the agents do: out of the
      // Decisions chapter into the first, through the log, and stopping at the
      // last one rather than looping – the log has an end, and the reader has
      // reached it.
      if (relativePath.startsWith("decisions/") && relativePath !== "decisions/index.md") {
        const slug = relativePath.slice("decisions/".length).replace(/\.md$/, "")
        const at = decisions.findIndex((decision) => decision.slug === slug)
        const { after, before } = neighbors(decisions, at)

        frontmatter["prev"] = before ? decisionLink(before) : decisionsChapter
        frontmatter["next"] = after ? decisionLink(after) : false
      }
    },

    themeConfig: {
      // On wide screens the logotype sits alone at the top of the sidebar (see
      // the theme's Layout) and the whole nav title block is hidden. Once the
      // sidebar collapses into a drawer, this nav copy is the only branding
      // left – the logotype's own wordmark would be unreadable at this single
      // line height, so this is the app icon instead, rounded in custom.css
      // to read as a mark rather than a favicon.
      logo: { src: "/icon.svg", alt: "Campfire" },

      // The chapter tree, shown on every page, listing the chapters in order
      // followed by the Decisions chapter (the ADR log's own index). A chapter
      // split across pages carries them as nested items, open, so the whole
      // guidebook is one glance; the Context chapter's groups and the
      // Architecture chapter's Layers and Example flows start collapsed,
      // because Context's people and systems would otherwise push every later
      // chapter below the fold. Every chapter keeps its own link – the index
      // page is the chapter, not a heading over it.
      sidebar: [
        {
          text: "Guidebook",
          items: [
            { text: "Introduction", link: "/" },
            {
              text: "Context",
              link: "/context/",
              collapsed: false,
              items: [
                { text: "People", collapsed: true, items: contextPeople },
                { text: "Systems", collapsed: true, items: contextSystems },
              ],
            },
            { text: "Process", link: "/process/" },
            {
              text: "Requirements",
              link: "/requirements/",
              collapsed: false,
              items: requirementsPages,
            },
            {
              text: "Architecture",
              link: "/architecture/",
              collapsed: false,
              items: [
                ...architecturePages,
                {
                  text: "Layers",
                  link: "/architecture/layers/",
                  collapsed: true,
                  items: layerPages,
                },
                {
                  text: "Example flows",
                  link: "/architecture/example-flows/",
                  collapsed: true,
                  items: exampleFlowPages,
                },
              ],
            },
            { text: "Design", link: "/design/" },
            {
              text: "Development",
              link: "/development/",
              collapsed: false,
              items: developmentPages,
            },
            {
              text: "Testing",
              link: "/testing/",
              collapsed: false,
              items: testingPages,
            },
            {
              text: "Maintenance",
              link: "/maintenance/",
              collapsed: false,
              items: maintenancePages,
            },
            { text: "Glossary", link: "/glossary/" },
            { text: "Decisions", link: "/decisions/" },
          ],
        },
      ],

      nav: [
        { text: "Guidebook", link: "/" },
        { text: "Decisions", link: "/decisions/" },
      ],

      search: {
        provider: "local",
      },

      socialLinks: [{ icon: "github", link: "https://github.com/Scouterna/wsj27-campfire" }],
    },

    vite: {
      // Static assets live beside this config rather than in docs/, which is
      // kept for content only. Vite copies everything here to the site root,
      // so the logotype is served at /logotype.png. Relative to the site
      // source root, as outDir and cacheDir above are.
      publicDir: "../config/vitepress/assets",

      // Pinned, and failing rather than drifting, because VitePress otherwise
      // starts at 5173 and hunts for the next free port, so the guidebook's
      // address would move whenever something else held it.
      server: {
        port: 3001,
        strictPort: true,
      },

      // Mermaid pulls in dependencies that ship CommonJS with no default ESM
      // export. The dev server resolves them eagerly and fails on "Importing
      // binding name 'default' cannot be resolved by star export entries"
      // before the page renders. Pre-bundling mermaid through esbuild inlines
      // that whole subtree with the same interop the production build gets
      // from Rollup.
      optimizeDeps: {
        include: ["mermaid"],
      },

      // Mermaid's diagram renderers are the site's heaviest chunks, past
      // Vite's 500 kB advisory – weight ADR 029 accepts for a documentation
      // site. The ceiling sits just above the largest of them, so it stays
      // quiet for what was chosen and still speaks if a chunk grows past it.
      build: {
        chunkSizeWarningLimit: 800,
      },
    },

    // Mermaid diagrams, styled to the contingent's graphic profile: flat
    // fills, no gradients, the official color carrying the emphasis. The
    // plugin forces Mermaid's own `dark` theme when the site is in dark mode
    // but applies these variables on top, so they are chosen to read on
    // either background.
    mermaid: {
      theme: "base",
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      themeVariables: {
        primaryColor: "#f9d578",
        primaryTextColor: "#000000",
        primaryBorderColor: "#000000",
        secondaryColor: "#f4c126",
        tertiaryColor: "#ffffff",
        lineColor: "#000000",
        textColor: "#000000",
        edgeLabelBackground: "#ffffff",
        clusterBkg: "#ffffff",
        clusterBorder: "#000000",
      },
    },
  }),
)

// withMermaid appends mermaid's own dependencies to optimizeDeps.include – a
// list written for npm's hoisted layout, where a transitive package resolves
// from the project root. Under pnpm's strict layout none of them does, so
// Vite warns "Failed to resolve dependency" for each of them on every dev
// start and then skips it – pre-bundling mermaid already inlines the same
// packages. Strip them rather than warn.
const unresolvable = new Set([
  "@braintree/sanitize-url",
  "cytoscape",
  "cytoscape-cose-bilkent",
  "dayjs",
  "debug",
])

if (config.vite?.optimizeDeps?.include) {
  config.vite.optimizeDeps.include = config.vite.optimizeDeps.include.filter(
    (dependency) => !unresolvable.has(dependency),
  )
}

export default config
