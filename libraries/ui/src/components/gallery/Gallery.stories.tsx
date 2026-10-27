import type { Meta, StoryObj } from "@storybook/react-vite"

import { Gallery, type GalleryPicture } from "./Gallery"

// Drawn rather than fetched, because nothing in Storybook touches a network.
function drawn(color: string, width: number, height: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${String(width)} ${String(height)}'><rect width='100%' height='100%' fill='${color}'/><circle cx='${String(width / 3)}' cy='${String(height / 3)}' r='${String(Math.min(width, height) / 8)}' fill='white'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function picture(index: number, color: string, width: number, height: number): GalleryPicture {
  const image = drawn(color, width, height)
  return {
    height,
    image,
    key: String(index),
    thumbnail: image,
    title: `Bild ${String(index)}`,
    width,
  }
}

const meta = {
  title: "Components/Gallery",
  component: Gallery,
  args: { label: "Bilder", placeholder: "Bild" },
} satisfies Meta<typeof Gallery>

export default meta

type Story = StoryObj<typeof meta>

export const Single: Story = {
  args: { pictures: [picture(1, "#ce4a17", 1600, 1200)] },
}

export const Portrait: Story = {
  args: { pictures: [picture(1, "#2f6377", 900, 1600)] },
}

export const Several: Story = {
  args: {
    pictures: [
      picture(1, "#ce4a17", 1600, 1200),
      picture(2, "#2f6377", 900, 1600),
      picture(3, "#7d6a4f", 1200, 1200),
      picture(4, "#9a3616", 2048, 683),
    ],
  },
}

export const Unreadable: Story = {
  args: {
    pictures: [{ ...picture(1, "#ce4a17", 1600, 1200), thumbnail: "/missing.jpg" }],
  },
}
