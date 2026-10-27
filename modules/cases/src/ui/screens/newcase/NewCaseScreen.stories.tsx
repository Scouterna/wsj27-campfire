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
 * The empty form as the health team sees it: a health case or a management case, and
 * neither chosen, because the two reach different people. Choosing one names who each
 * level reaches. Typing "Forsberg" finds two people, and choosing one puts them in place
 * of the search. Creating the case writes to a network the catalog does not have, so it
 * fails the way a refused write does.
 */
export const Empty: Story = {
  parameters: { api: { people: peopleRows } },
}

/**
 * A leader of unit 1 has one kind of case to open – their unit's – so it is chosen, the
 * levels name the unit's leaders, and the search keeps to the unit.
 */
export const Leader: Story = {
  parameters: {
    api: {
      people: peopleRows,
      roles: [{ kind: "leader", unitNumber: 1 }],
      types: ["avdelning"],
    },
  },
}

/**
 * The service gives a type the module has never heard of, which is offered after the known
 * ones by its own name, its levels naming its group.
 */
export const AnotherType: Story = {
  parameters: { api: { people: peopleRows, types: ["hälsa", "säkerhet", "cmt"] } },
}

/**
 * Someone whose roles give them no type to open a case of.
 */
export const NoType: Story = {
  parameters: { api: { people: peopleRows, types: [] } },
}

/**
 * Opened from a person's own screen, with them already chosen.
 */
export const ForAPerson: Story = {
  args: { memberNo: "1300035" },
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
