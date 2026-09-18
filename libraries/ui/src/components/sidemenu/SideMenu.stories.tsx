import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { HomeIcon } from "../../foundations/icons/set/HomeIcon"
import { ParticipantsIcon } from "../../foundations/icons/set/ParticipantsIcon"
import { ProfilePill } from "../profilepill/ProfilePill"
import { SideMenu, type SideMenuItem } from "./SideMenu"

const meta: Meta<typeof SideMenu> = {
  title: "Components/SideMenu",
  component: SideMenu,
}

export default meta

type Story = StoryObj<typeof SideMenu>

const home: SideMenuItem = { id: "home", label: "Hem", path: "/", icon: <HomeIcon /> }

const items: readonly SideMenuItem[] = [
  home,
  { id: "participants", label: "Deltagare", path: "/participants", icon: <ParticipantsIcon /> },
]

/**
 * The desktop menu: the mark, the sections, and the profile control at the foot.
 */
export const Default: Story = {
  render: (): ReactElement => (
    <div className="story-menu">
      <SideMenu
        items={items}
        current="home"
        teaser="Mer kommer snart…"
        footer={
          <ProfilePill
            name="Anna Björk"
            detail="Ledare · Avdelning 3"
            label="Profil för Anna Björk"
            link={{ to: "/profile" }}
          />
        }
      />
    </div>
  ),
}

/**
 * A leader's menu names their own unit rather than the whole list of participants.
 */
export const ForALeader: Story = {
  render: (): ReactElement => (
    <div className="story-menu">
      <SideMenu
        items={[
          home,
          {
            id: "participants",
            label: "Min avdelning",
            path: "/participants",
            icon: <ParticipantsIcon />,
          },
        ]}
        current="participants"
        footer={
          <ProfilePill
            name="Anna Björk"
            detail="Ledare · Avdelning 3"
            label="Profil för Anna Björk"
            link={{ to: "/profile" }}
          />
        }
      />
    </div>
  ),
}

/**
 * Choosing the section already shown does not navigate – the caller decides what it
 * means, scrolling to the top typically. The story counts the reselects instead; the
 * story starts at the home address, so Hem is the section to press.
 */
export const Reselect: Story = {
  render: function ReselectStory(): ReactElement {
    const [reselects, setReselects] = useState(0)

    return (
      <div className="story-stack">
        <div className="story-menu">
          <SideMenu
            items={items}
            current="home"
            onReselect={() => {
              setReselects((count) => count + 1)
            }}
          />
        </div>
        <span className="story-readout">Hem valt igen {reselects} gånger</span>
      </div>
    )
  },
}
