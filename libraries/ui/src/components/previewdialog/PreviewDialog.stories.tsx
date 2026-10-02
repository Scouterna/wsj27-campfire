import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { Button } from "../button/Button"
import { PreviewDialog, type PreviewDialogProps } from "./PreviewDialog"

// Drawn rather than fetched, because nothing in Storybook touches a network.
const inked =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='%23b8860b'/%3E%3C/svg%3E"
const white =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='26' fill='white'/%3E%3C/svg%3E"

/**
 * A button that opens the dialog, and closes it the way an owner does – by unmounting it.
 * @param props The dialog's own props, less how it closes.
 * @returns The button, and the dialog while it is open.
 */
function Opener(props: Omit<PreviewDialogProps, "onClose">): ReactElement {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <Button
        label="Visa"
        onPress={() => {
          setIsOpen(true)
        }}
      />
      {isOpen ? (
        <PreviewDialog
          {...props}
          onClose={() => {
            setIsOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

const meta: Meta<typeof Opener> = {
  title: "Components/PreviewDialog",
  component: Opener,
}

export default meta

type Story = StoryObj<typeof Opener>

/**
 * A picture on the pale wash, with its facts and an action under it.
 */
export const Light: Story = {
  args: {
    children: <Button label="Ladda ner" link={{ to: "/" }} />,
    description: "PNG · 85,4 kB",
    image: inked,
    placeholder: "PNG",
    title: "Logotyp",
    tone: "light",
  },
}

/**
 * A white picture on the theme's ink, the backdrop it was drawn for.
 */
export const Dark: Story = {
  args: { ...Light.args, image: white, title: "Logotyp, vit", tone: "dark" },
}

/**
 * A picture that does not load leaves its placeholder in the frame.
 */
export const WithoutPicture: Story = {
  args: { ...Light.args, image: "data:image/png;base64,broken", placeholder: "PDF" },
}
