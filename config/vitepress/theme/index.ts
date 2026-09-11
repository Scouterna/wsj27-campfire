import { withBase } from "vitepress"
import DefaultTheme from "vitepress/theme"
import { h, type VNode } from "vue"
import "./custom.css"
import ImageLightbox from "./ImageLightbox.vue"

// The guidebook uses VitePress's default theme with a small stylesheet of
// Campfire overrides layered on top (see custom.css), plus the contingent
// logotype injected at the top of the sidebar.
//
// The logotype goes in the sidebar rather than the nav because the mark is
// near-square: the nav's logo slot is a single line tall, which would shrink
// it past the point where the jamboree line is readable. The default theme's
// `sidebar-nav-before` slot gives it the full sidebar width instead, and
// custom.css hides the nav's own title block above 960px so the mark stands
// alone – below that the sidebar is a drawer, and the nav copy is all there is.
//
// The lightbox sits in the `layout-bottom` slot, once per page: a click on any
// image or Mermaid diagram in the content opens it full width, which is what
// makes an exported architecture diagram readable without leaving the page.
export default {
  extends: DefaultTheme,
  Layout: (): VNode =>
    h(DefaultTheme.Layout, undefined, {
      "sidebar-nav-before": () =>
        h("img", {
          class: "campfire-logotype",
          // withBase, because the site is served from a subpath – a bare
          // "/logotype.png" would resolve to the domain root instead.
          src: withBase("/logotype.png"),
          alt: "Swedish Contingent – 26th World Scout Jamboree, Poland 2027",
        }),
      "layout-bottom": () => h(ImageLightbox),
    }),
}
