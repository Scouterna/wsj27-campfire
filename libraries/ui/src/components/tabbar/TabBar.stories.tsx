import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { HomeIcon } from "../../foundations/icons/set/HomeIcon"
import { ParticipantsIcon } from "../../foundations/icons/set/ParticipantsIcon"
import { TabBar, type TabBarItem } from "./TabBar"

const meta: Meta<typeof TabBar> = {
  title: "Components/TabBar",
  component: TabBar,
}

export default meta

type Story = StoryObj<typeof TabBar>

const items: readonly TabBarItem[] = [
  { id: "home", label: "Hem", path: "/", icon: <HomeIcon /> },
  { id: "participants", label: "Deltagare", path: "/participants", icon: <ParticipantsIcon /> },
]

/**
 * The section being read is lit.
 */
export const Sections: Story = {
  render: (): ReactElement => <TabBar items={items} current="participants" />,
}

/**
 * A screen belonging to no section – the not-found page – lights up nothing.
 */
export const NothingCurrent: Story = {
  render: (): ReactElement => <TabBar items={items} current={undefined} />,
}
