import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import {
  foodUnitForHealthTeam,
  foodUnitForLeader,
  foodUnitNumber,
  foodUnitWithNothing,
} from "./fixtures"
import { FoodScreen, type FoodScreenProps } from "./FoodScreen"
import { toggled, type RowKey } from "./search"

const healthTeam = { memberNo: "1200001", readsEveryone: true, readsHealth: true } as const

const leaderOfUnit = {
  memberNo: "1700020",
  readsEveryone: false,
  readsHealth: false,
  unitNumber: foodUnitNumber,
} as const

/**
 * The screen with its expanded rows held in the story rather than in an address, so a
 * row opens and closes as it does in the application.
 * @param props The unit, and the rows open at first.
 * @returns The screen.
 */
function Toggling(props: Pick<FoodScreenProps, "open" | "unit">): ReactElement {
  const [open, setOpen] = useState<readonly RowKey[]>(props.open)
  return (
    <FoodScreen
      onToggle={(key) => {
        setOpen((current) => toggled(current, key).open ?? [])
      }}
      open={open}
      unit={props.unit}
    />
  )
}

const meta: Meta<typeof FoodScreen> = {
  title: "Modules/Participants/Screens/FoodScreen",
  component: FoodScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  args: { open: [], unit: String(foodUnitNumber) },
  // Seeded per story rather than here, because a story's parameters merge into these, and
  // a seeded unit would outlast a story asking for a pending or failed read.
  parameters: { api: { viewer: healthTeam }, layout: "fullscreen" },
  render: (args) => <Toggling open={args.open} unit={args.unit} />,
}

export default meta

type Story = StoryObj<typeof FoodScreen>

/**
 * A unit as the health team reads it, its leaders included. Press a person to read what
 * they wrote.
 */
export const Filled: Story = {
  parameters: {
    api: { unitDetails: { people: foodUnitForHealthTeam, unitNumber: foodUnitNumber } },
  },
}

/**
 * The same unit as one of its leaders reads it, told that the leaders are left out.
 */
export const Withheld: Story = {
  parameters: {
    api: {
      unitDetails: { people: foodUnitForLeader, unitNumber: foodUnitNumber },
      viewer: leaderOfUnit,
    },
  },
}

/**
 * Ester's row in Nötter opened to her description, and Melvin's in Laktos to say he
 * wrote none.
 */
export const Expanded: Story = {
  args: { open: ["allergen-nuts:1700001", "allergen-lactose:1700008"] },
  parameters: {
    api: { unitDetails: { people: foodUnitForHealthTeam, unitNumber: foodUnitNumber } },
  },
}

/**
 * A unit where nobody declared a diet or a food allergy.
 */
export const Empty: Story = {
  parameters: {
    api: { unitDetails: { people: foodUnitWithNothing, unitNumber: foodUnitNumber } },
  },
}

/**
 * The unit is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The unit could not be read, and there is nothing stored to show instead.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}

/**
 * A reader whose role does not reach this unit's health answers.
 */
export const Refused: Story = {
  parameters: {
    api: { viewer: { memberNo: "1200102", readsEveryone: true, readsHealth: false } },
  },
}
