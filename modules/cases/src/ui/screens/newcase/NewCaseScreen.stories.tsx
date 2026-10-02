import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { peopleRows } from "../../storybook/fixtures"
import { NewCaseScreen } from "./NewCaseScreen"

const meta: Meta<typeof NewCaseScreen> = {
  title: "Modules/Cases/Screens/NewCaseScreen",
  component: NewCaseScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof NewCaseScreen>

/**
 * The empty form over the mock's contingent. Typing "Forsberg" finds two people, and
 * choosing one puts them in place of the search. Creating the case writes to a network
 * the catalog does not have, so it fails the way a refused write does.
 */
export const Empty: Story = {
  parameters: { api: { people: peopleRows } },
}

/**
 * The contingent is still on its way, so the search has nobody to find yet.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused, so there is nobody to open a case about – and the
 * box offers to ask again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
