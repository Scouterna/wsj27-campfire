<script setup lang="ts">
// The lightbox that expands a guidebook image or an inline Mermaid diagram
// over the page. Mounted once by the theme's layout; it listens on the
// document, so a page needs no markup of its own to opt in.
import { onBeforeUnmount, onMounted, ref } from "vue"

// What is expanded: an image by its source, or a Mermaid diagram by its
// rendered markup, since the diagram is an inline SVG rather than a file.
type Expanded = { kind: "image"; alt: string; src: string } | { kind: "svg"; markup: string }

const expanded = ref<Expanded | null>(null)

/** Expands the image or Mermaid diagram under a click inside the page body. */
function open(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element) || !target.closest(".vp-doc")) {
    return
  }

  if (target instanceof HTMLImageElement) {
    expanded.value = { kind: "image", alt: target.alt, src: target.currentSrc || target.src }
    return
  }

  // Mermaid renders inline, so a diagram is an <svg> in the page rather than an
  // <img>. The click lands on whichever shape or label is under the pointer, so
  // the diagram has to be found from there.
  const diagram = target.closest(".mermaid")?.querySelector("svg")
  if (diagram) {
    expanded.value = { kind: "svg", markup: diagram.outerHTML }
  }
}

/** Collapses whatever is expanded. */
function close() {
  expanded.value = null
}

/** Closes the lightbox on Escape, the way a dialog is expected to close. */
function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close()
  }
}

onMounted(() => {
  document.addEventListener("click", open)
  document.addEventListener("keydown", closeOnEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", open)
  document.removeEventListener("keydown", closeOnEscape)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="expanded"
      class="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded diagram"
      @click="close"
    >
      <button class="image-lightbox-close" type="button" aria-label="Close" @click="close">
        ×
      </button>
      <img v-if="expanded.kind === 'image'" :src="expanded.src" :alt="expanded.alt" />
      <!-- v-html is safe here: the markup is the page's own rendered Mermaid
           output, read back out of the DOM, never anything a user supplied. -->
      <div v-else class="mermaid" v-html="expanded.markup"></div>
    </div>
  </Teleport>
</template>
