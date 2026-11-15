import { describe, expect, it } from "vitest"

import type { HandbookPage } from "../model/Handbook"
import { embedImages } from "./embed-images"

const image = (source: string) =>
  ({ alt: "", height: 10, kind: "image", src: source, width: 10 }) as const

const page: HandbookPage = {
  chapter: { id: 1, name: "Bilaga", order: 0, slug: "bilaga" },
  content: [
    image("/media/a.webp"),
    {
      kind: "table",
      rows: [[{ blocks: [image("/media/b.webp")], isHeader: false }]],
    },
  ],
  id: 1,
  isPublic: true,
  position: 0,
  slug: "bilaga",
  title: "Bilaga",
}

describe("embedImages", () => {
  it("puts every image inside the page, tables included, reading each once", async () => {
    const asked: string[] = []
    const [embedded] = await embedImages([page, page], (source) => {
      asked.push(source)
      return Promise.resolve(`data:${source}`)
    })

    expect(asked.toSorted((a, b) => a.localeCompare(b))).toStrictEqual([
      "/media/a.webp",
      "/media/b.webp",
    ])
    expect(embedded?.content).toStrictEqual([
      image("data:/media/a.webp"),
      { kind: "table", rows: [[{ blocks: [image("data:/media/b.webp")], isHeader: false }]] },
    ])
  })

  it("keeps the address of an image that cannot be read", async () => {
    const [embedded] = await embedImages([page], (source) =>
      Promise.resolve(source.endsWith("a.webp") ? undefined : `data:${source}`),
    )

    expect(embedded?.content[0]).toStrictEqual(image("/media/a.webp"))
  })
})
