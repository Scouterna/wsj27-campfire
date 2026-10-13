import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"

import { everyBlock } from "../../storybook/fixtures"
import { RichText } from "./RichText"

const onASheet: Decorator = (Story) => (
  <Card>
    <Story />
  </Card>
)

const meta: Meta<typeof RichText> = {
  title: "Modules/Handbook/Components/RichText",
  component: RichText,
  decorators: [onASheet],
}

export default meta

type Story = StoryObj<typeof RichText>

export const EveryBlock: Story = {
  args: { blocks: everyBlock, headingLevel: 2 },
}
