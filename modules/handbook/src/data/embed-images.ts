import type { HandbookPage } from "../model/Handbook"
import { imagesOf, type Block } from "../model/RichText"

/**
 * Reads one image and answers it as a `data:` address, or undefined when it cannot.
 */
export type ImageLoader = (source: string) => Promise<string | undefined>

/**
 * The pages with every image's address replaced by the image itself, so the handbook's
 * pictures are kept with its text and show with no connection – in a shell's webview,
 * which may have no service worker, as much as in a browser. An image that cannot be
 * read keeps its address, so it still loads wherever a connection allows.
 * @param pages The pages, as converted.
 * @param load Reads one image.
 * @returns The same pages, their images inside them.
 */
export async function embedImages(
  pages: readonly HandbookPage[],
  load: ImageLoader,
): Promise<readonly HandbookPage[]> {
  const sources = new Set(pages.flatMap((page) => imagesOf(page.content)))
  const loaded = new Map<string, string>()
  await Promise.all(
    [...sources].map(async (source) => {
      const data = await load(source)
      if (data !== undefined) {
        loaded.set(source, data)
      }
    }),
  )
  if (loaded.size === 0) {
    return pages
  }
  return pages.map((page) => ({ ...page, content: withImages(page.content, loaded) }))
}

/**
 * Content with each image's address swapped for what was read of it.
 * @param blocks The content.
 * @param loaded The images read, by their address.
 * @returns The content, its images inside it.
 */
function withImages(blocks: readonly Block[], loaded: ReadonlyMap<string, string>): Block[] {
  return blocks.map((block): Block => {
    if (block.kind === "image") {
      return { ...block, src: loaded.get(block.src) ?? block.src }
    }
    if (block.kind === "table") {
      return {
        ...block,
        rows: block.rows.map((row) =>
          row.map((cell) => ({ ...cell, blocks: withImages(cell.blocks, loaded) })),
        ),
      }
    }
    return block
  })
}

/**
 * Reads an image on the application's origin as a `data:` address. The `fetch` in utils
 * reads JSON, so the platform's own reads the bytes.
 * @param source The image's origin-relative address.
 * @returns The image, or undefined when it could not be read.
 */
export async function loadAsDataAddress(source: string): Promise<string | undefined> {
  try {
    const response = await fetch(source)
    if (!response.ok) {
      return undefined
    }
    const blob = await response.blob()
    // An address that answers with something else – the application's own page, where
    // the CMS no longer holds the picture – is not a picture to keep.
    if (!blob.type.startsWith("image/")) {
      return undefined
    }
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        resolve(typeof reader.result === "string" ? reader.result : undefined)
      })
      reader.addEventListener("error", () => {
        resolve(undefined)
      })
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}
