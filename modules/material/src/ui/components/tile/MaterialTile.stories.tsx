import type { Meta, StoryObj } from "@storybook/react-vite"

import { inkedMark, whiteMark } from "../../storybook/cast"
import { DownloadLink } from "./DownloadLink"
import { MaterialTile } from "./MaterialTile"

const meta: Meta<typeof MaterialTile> = {
  title: "Modules/Material/Components/MaterialTile",
  component: MaterialTile,
  parameters: { layout: "centered" },
}

export default meta

type Story = StoryObj<typeof MaterialTile>

/**
 * A colored symbol on the pale wash, with its two formats to download.
 */
export const Colored: Story = {
  args: {
    children: (
      <>
        <DownloadLink fileName="björnen_logo_color.svg" format="SVG" href="#" />
        <DownloadLink fileName="björnen_logo_color.png" format="PNG" href="#" />
      </>
    ),
    label: "Logotyp",
    picture: inkedMark,
    placeholder: "SVG",
    thumbnail: inkedMark,
    tone: "light",
  },
}

/**
 * The white version of the same symbol, on the theme's ink – the only backdrop it is
 * visible against.
 */
export const White: Story = {
  args: {
    ...Colored.args,
    label: "Logotyp, vit",
    picture: whiteMark,
    thumbnail: whiteMark,
    tone: "dark",
  },
}

/**
 * A file with its type and size under its name, and one download.
 */
export const WithFacts: Story = {
  args: {
    children: <DownloadLink fileName="WSJ27SE_form version 8.pdf" href="#" />,
    label: "WSJ27SE_form version 8",
    meta: "PDF · 2,3 MB",
    picture: inkedMark,
    placeholder: "PDF",
    thumbnail: inkedMark,
    tone: "light",
  },
}

/**
 * A picture that does not load – offline, or a file Drive cannot draw – leaves the
 * file's type in the frame, so the grid keeps its rhythm. Its preview offers Drive's
 * viewer, as a document's does.
 */
export const WithoutPicture: Story = {
  args: {
    ...WithFacts.args,
    children: <DownloadLink fileName="LieberathGrotesque-Bold.otf" href="#" />,
    label: "LieberathGrotesque-Bold",
    meta: "OTF · 27,2 kB",
    picture: "data:image/png;base64,broken",
    placeholder: "OTF",
    thumbnail: "data:image/png;base64,broken",
    viewerUrl: "#",
  },
}
