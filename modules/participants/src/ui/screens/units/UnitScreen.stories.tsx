import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitWithHomeTowns, wholeList } from "../../storybook/cast"
import { UnitScreen } from "./UnitScreen"

const meta: Meta<typeof UnitScreen> = {
  title: "Modules/Participants/Screens/UnitScreen",
  component: UnitScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { api: { list: wholeList }, layout: "fullscreen" },
  args: { entryKey: "1" },
}

export default meta

type Story = StoryObj<typeof UnitScreen>

/**
 * One numbered unit: its own card over a dimmed map of where its people live – press it
 * to open the map – then everyone in one name-sorted list, each row saying where they
 * come from, and a count that says where they are.
 */
export const OneUnit: Story = {}

/**
 * The IST is not an avdelning, so the count says only how many they are.
 */
export const Ist: Story = {
  args: { entryKey: "ist" },
}

/**
 * The contingent management, the other entry that is not a unit.
 */
export const Cmt: Story = {
  args: { entryKey: "cmt" },
}

/**
 * A unit nobody in the viewer's scope is in, or one that does not exist – the same answer
 * either way, with the title kept so the screen still says where the reader is.
 */
export const UnknownUnit: Story = {
  args: { entryKey: "42" },
}

/**
 * The list this screen is read out of is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused, so the control asks again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}

/**
 * A unit whose home towns are all abroad, which the map cannot place: the unit's card is
 * its identity alone, and nothing says who is missing from a map that is not there.
 */
export const OnlyUnplacedHomeTowns: Story = {
  parameters: {
    api: {
      list: {
        ...unitWithHomeTowns(["Bryssel (Belgien)", "Oslo (Norge)"]),
        scope: { kind: "all" },
      },
    },
  },
}

/**
 * A unit nobody's home town is known for: the card is its identity alone, and the map is
 * never loaded to find that out.
 */
export const WithoutHomeTowns: Story = {
  parameters: {
    api: { list: { ...unitWithHomeTowns([]), scope: { kind: "all" } } },
  },
}
