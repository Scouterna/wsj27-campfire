import { withBase } from "vitepress"
import DefaultTheme from "vitepress/theme"
import { h, type VNode } from "vue"
import "./custom.css"
import ImageLightbox from "./ImageLightbox.vue"

// The guidebook uses VitePress's default theme with Campfire's overrides layered
// on top, plus the contingent logotype at the top of the sidebar.
//
// The logotype goes in the sidebar rather than the nav because the mark is
// near-square, and the nav's single-line logo slot would shrink it past the
// point where the jamboree line is readable. The `sidebar-nav-before` slot
// gives it the full sidebar width instead.
//
// The lightbox sits in the `layout-bottom` slot, once per page, which is what
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
