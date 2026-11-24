import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { wholeList } from "../../storybook/cast"
import { WithheldPictures } from "./WithheldPictures"

const meta: Meta<typeof WithheldPictures> = {
  title: "Modules/Participants/Components/WithheldPictures",
  component: WithheldPictures,
  args: { unitNumber: 1 },
  decorators: [ApiDecorator],
  parameters: { api: { list: wholeList } },
}

export default meta

type Story = StoryObj<typeof WithheldPictures>

/**
 * Unit 1 as the contingent management reads it, where several people said no – a leader
 * among them, whom the unit's own leaders are not sent: their names under the title, each
 * a way into them.
 */
export const SeveralSaidNo: Story = {}

/**
 * Unit 2, where one person said no.
 */
export const OneSaidNo: Story = {
  args: { unitNumber: 2 },
}

/**
 * A unit where nobody the reader can see said no draws nothing at all.
 */
export const NobodySaidNo: Story = {
  args: { unitNumber: 3 },
}
