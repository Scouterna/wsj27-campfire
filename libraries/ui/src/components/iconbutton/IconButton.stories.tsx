import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { HandIcon } from "../../foundations/icons/set/HandIcon"
import { PictureIcon } from "../../foundations/icons/set/PictureIcon"
import { SendIcon } from "../../foundations/icons/set/SendIcon"
import { IconButton } from "./IconButton"

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  args: { onPress: fn() },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const Secondary: Story = {
  args: { icon: <PictureIcon size={20} />, label: "Bifoga bild" },
}

export const Primary: Story = {
  args: { icon: <SendIcon size={20} strokeWidth={2.4} />, label: "Skicka", variant: "primary" },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    icon: <SendIcon size={20} strokeWidth={2.4} />,
    label: "Skicka",
    variant: "primary",
  },
}

export const Small: Story = {
  args: {
    icon: <HandIcon size={16} />,
    label: "Jag tar det",
    size: "small",
  },
}
