import { cmtTheme } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitWithHomeTowns } from "../../storybook/cast"
import { UnitCard } from "./UnitCard"

const regional = unitWithHomeTowns([
  "Göteborg",
  "Göteborg",
  "Mölndal",
  "Kungsbacka",
  "Partille",
  "Lerum",
  "Alingsås",
  "Kungälv",
  "Stenungsund",
]).people

const meta: Meta<typeof UnitCard> = {
  title: "Modules/Participants/Components/UnitCard",
  component: UnitCard,
  // For its network, which reaches nothing off the catalog's origin, so the map draws
  // its dots over no background, as it does offline.
  decorators: [ApiDecorator],
  args: { openLabel: "Visa på kartan", people: regional, unitNumber: 1 },
}

export default meta

type Story = StoryObj<typeof UnitCard>

/**
 * The unit's identity over a dimmed map of where its people live – in the unit's own
 * color whatever the page around it wears. Press it to open the map, where a town more
 * than one person lives in carries the count.
 */
export const WithMap: Story = {}

/**
 * On the leader's own home screen: a heading over the sheet, and a hint that says "ni".
 */
export const OnHome: Story = {
  args: { openLabel: "Se var ni bor", title: "Min avdelning" },
}

/**
 * As the management sees a unit in the unit browser: the whole card in the management's
 * color rather than the unit's.
 */
export const ForTheManagement: Story = {
  args: { viewerTheme: cmtTheme },
}

/**
 * Every home town abroad, so none is placed: the card is the identity alone.
 */
export const OnlyUnplacedHomeTowns: Story = {
  args: { people: unitWithHomeTowns(["Bryssel (Belgien)", "Oslo (Norge)"]).people },
}

/**
 * Nobody's home town is known, so the card is the identity alone.
 */
export const WithoutHomeTowns: Story = {
  args: { people: unitWithHomeTowns([]).people },
}
