import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator, type ApiParameters } from "../../storybook/ApiDecorator"
import { targetRows } from "../../storybook/fixtures"
import { ImpersonationConfirmScreen } from "./ImpersonationConfirmScreen"

const meta = {
  title: "Modules/Authentication/Screens/ImpersonationConfirmScreen",
  component: ImpersonationConfirmScreen,
  decorators: [ApiDecorator, ScreenDecorator],
  args: { memberNo: "1100101" },
  parameters: {
    api: { offered: true, targets: targetRows } satisfies ApiParameters,
    // A screen fills the frame, because the decorator draws the page surface, so the
    // canvas adds no padded box around it.
    layout: "fullscreen",
  },
} satisfies Meta<typeof ImpersonationConfirmScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Leader: Story = {}

export const Management: Story = {
  args: { memberNo: "1200101" },
}

export const NobodyToBe: Story = {
  args: { memberNo: "1400001" },
}

export const Failed: Story = {
  parameters: { api: { offered: true, state: "error" } satisfies ApiParameters },
}
