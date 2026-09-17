import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn } from "storybook/test"

import { OverflowMenu } from "../overflowmenu/OverflowMenu"
import { ProfilePill } from "../profilepill/ProfilePill"
import { NavigationBar } from "./NavigationBar"

const meta: Meta<typeof NavigationBar> = {
  title: "Components/NavigationBar",
  component: NavigationBar,
}

export default meta

type Story = StoryObj<typeof NavigationBar>

const trailing = (
  <ProfilePill
    compact
    name="Anna Björk"
    detail="Ledare · Avdelning 3"
    label="Logga ut Anna Björk"
    onPress={fn()}
  />
)

/**
 * Over the page's own heading the bar is transparent and its title is held back –
 * scroll a page to see it condense into glass. The story pins the resting state.
 */
export const Resting: Story = {
  render: (): ReactElement => <NavigationBar title="Välkommen" trailing={trailing} />,
}

/**
 * The trailing slot carries the page's overflow menu beside the profile control when
 * the screen declares one.
 */
export const WithMenu: Story = {
  render: (): ReactElement => (
    <NavigationBar
      title="Min avdelning"
      trailing={
        <>
          <OverflowMenu items={[{ label: "Visa i Deltagare", onSelect: fn() }]} />
          {trailing}
        </>
      }
    />
  ),
}
