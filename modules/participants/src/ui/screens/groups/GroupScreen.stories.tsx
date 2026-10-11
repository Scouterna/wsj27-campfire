import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitWithHomeTowns, wholeList } from "../../storybook/cast"
import { GroupScreen } from "./GroupScreen"

const meta: Meta<typeof GroupScreen> = {
  title: "Modules/Participants/Screens/GroupScreen",
  component: GroupScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { api: { list: wholeList }, layout: "fullscreen" },
  args: { groupKey: "1" },
}

export default meta

type Story = StoryObj<typeof GroupScreen>

/**
 * One numbered unit: its own card over a dimmed map of where its people live – press it
 * to open the map – then everyone in one name-sorted list, each row saying where they
 * come from, and a count that says where they are.
 */
export const OneUnit: Story = {}

/**
 * An IST patrol, numbered in the same series as the units but never one of them – no
 * unit's card, and a count that says only how many they are.
 */
export const IstPatrol: Story = {
  args: { groupKey: "ist-7" },
}

/**
 * The IST outside every patrol, together.
 */
export const IstWithoutPatrol: Story = {
  args: { groupKey: "ist" },
}

/**
 * One funktion of the contingent management.
 */
export const CmtFunktion: Story = {
  args: { groupKey: "cmt-administration" },
}

/**
 * A unit nobody in the viewer's scope is in, or one that does not exist – the same answer
 * either way, with the title kept so the screen still says where the reader is.
 */
export const UnknownUnit: Story = {
  args: { groupKey: "42" },
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
