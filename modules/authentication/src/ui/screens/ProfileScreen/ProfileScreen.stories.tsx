import {
  RevealProvider,
  ScreenDecorator,
  unitsReveal,
  type Reveal,
} from "@scouterna/wsj27-campfire-ui"
import { UserProvider, type User } from "@scouterna/wsj27-campfire-utils"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { ProfileScreen } from "./ProfileScreen"

const meta = {
  title: "Modules/Authentication/Screens/ProfileScreen",
  component: ProfileScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, as sign-in's does – the decorator draws the page
    // surface, so the canvas adds no padded box around it.
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProfileScreen>

export default meta

type Story = StoryObj<typeof meta>

const leader: User = {
  firstName: "Lars",
  mark: { isLeader: true, unitNumber: 1 },
  memberNo: "1100101",
  name: "Lars Lindberg",
  roleLine: "Ledare",
  roleLineWithUnit: "Ledare · Avdelning 1",
  roles: [{ kind: "leader", unitNumber: 1 }],
  travel: "rundresa",
  unit: { number: 1 },
}

const management: User = {
  firstName: "Pernilla",
  mark: { isLeader: false },
  memberNo: "1200101",
  name: "Pernilla Palm",
  roleLine: "CMT · Program",
  roleLineWithUnit: "CMT · Program",
  roles: [{ kind: "cmt" }, { kind: "program" }],
}

const nobodyInParticular: User = {
  firstName: "Olle",
  memberNo: "1400001",
  name: "Olle Ohlsson",
  roleLine: "Deltagare",
  roleLineWithUnit: "Deltagare",
  roles: [],
}

// The units reveal, still a long way off – hung in a provider of its own, because
// outside one every curtain reads as open.
const closed: readonly Reveal[] = [{ ...unitsReveal, at: new Date("2999-01-01T00:00:00Z") }]

export const Leader: Story = {
  render: (): ReactElement => (
    <UserProvider user={leader}>
      <ProfileScreen />
    </UserProvider>
  ),
}

export const LeaderBeforeTheReveal: Story = {
  render: (): ReactElement => (
    <RevealProvider reveals={closed}>
      <UserProvider user={leader}>
        <ProfileScreen />
      </UserProvider>
    </RevealProvider>
  ),
}

export const Management: Story = {
  render: (): ReactElement => (
    <UserProvider user={management}>
      <ProfileScreen />
    </UserProvider>
  ),
}

export const NobodyInParticular: Story = {
  render: (): ReactElement => (
    <UserProvider user={nobodyInParticular}>
      <ProfileScreen />
    </UserProvider>
  ),
}
