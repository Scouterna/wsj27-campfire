import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitList, unitWithHomeTowns } from "../../storybook/cast"
import { UnitWidget } from "./UnitWidget"

const meta: Meta<typeof UnitWidget> = {
  title: "Modules/Participants/Widgets/UnitWidget",
  component: UnitWidget,
  decorators: [ApiDecorator],
}

export default meta

type Story = StoryObj<typeof UnitWidget>

/**
 * A leader's unit as the home screen shows it: the unit's card over a dimmed map of
 * where its people live, then the deltagare and the ledare as pills, each saying where
 * they come from under the name.
 */
export const OneUnit: Story = {
  parameters: {
    api: {
      list: unitList(1),
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: true, unitNumber: 1 },
    },
  },
}

/**
 * Still on its way – the identity shows at once, the people follow.
 */
export const Pending: Story = {
  parameters: {
    api: {
      state: "pending",
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: true, unitNumber: 1 },
    },
  },
}

const leaderOfUnit1 = {
  memberNo: "1500000",
  readsEveryone: false,
  readsHealth: true,
  unitNumber: 1,
} as const

/**
 * A unit from one region, as most are: the map behind the unit's name is framed on
 * Göteborg and the towns around it. Press the card to open the map.
 */
export const WithMap: Story = {
  parameters: {
    api: {
      list: unitWithHomeTowns([
        "Göteborg",
        "Göteborg",
        "Göteborg",
        "Mölndal",
        "Kungsbacka",
        "Partille",
        "Göteborg",
        "Lerum",
        "Alingsås",
        "VÄSTRA FRÖLUNDA",
        "Kungälv",
        "Hisings Backa",
        "Stenungsund",
        "Mölndal",
        "Torslanda",
        "Askim",
        "Borås",
      ]),
      viewer: leaderOfUnit1,
    },
  },
}

/**
 * A unit gathered from all over the country – the frame widens to hold everybody, from
 * Kiruna to Malmö.
 */
export const WithMapAcrossSweden: Story = {
  parameters: {
    api: {
      list: unitWithHomeTowns([
        "Stockholm",
        "Uppsala",
        "Malmö",
        "Umeå",
        "Luleå",
        "Kiruna",
        "Östersund",
        "Visby",
        "Karlstad",
        "Jönköping",
        "Stockholm",
        "Göteborg",
      ]),
      viewer: leaderOfUnit1,
    },
  },
}

/**
 * Some home towns the map cannot find – an abbreviation, a town abroad. Only the placed
 * ones are dots, and nothing says anybody is missing.
 */
export const WithUnplacedHomeTowns: Story = {
  parameters: {
    api: {
      list: unitWithHomeTowns([
        "Linköping",
        "Norrköping",
        "Linköping",
        "Sthlm",
        "Oslo (Norge)",
        "Motala",
      ]),
      viewer: leaderOfUnit1,
    },
  },
}

/**
 * Every home town abroad, so no dot to draw: the card is the unit's identity alone.
 */
export const OnlyUnplacedHomeTowns: Story = {
  parameters: {
    api: {
      list: unitWithHomeTowns(["Bryssel (Belgien)", "Oslo (Norge)"]),
      viewer: leaderOfUnit1,
    },
  },
}

/**
 * Nobody's home town known, because the service sent none: the card is the unit's
 * identity alone, and each row says the kår it knows.
 */
export const WithoutHomeTowns: Story = {
  parameters: {
    api: { list: unitWithHomeTowns([]), viewer: leaderOfUnit1 },
  },
}
