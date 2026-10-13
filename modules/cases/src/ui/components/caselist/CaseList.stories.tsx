import type { Meta, StoryObj } from "@storybook/react-vite"

import { toCases } from "../../../data/dto/CaseDto"
import { toPeople } from "../../../data/dto/PersonDto"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { CaseList } from "./CaseList"

const cases = toCases(caseRows)
const people = toPeople(peopleRows)

const meta: Meta<typeof CaseList> = {
  title: "Modules/Cases/Components/CaseList",
  component: CaseList,
  args: {
    cases: cases.filter((item) => !item.isClosed),
    people,
    title: "Öppna ärenden",
  },
}

export default meta

type Story = StoryObj<typeof CaseList>

/**
 * The open cases, each naming who it is about and their unit, who opened it, and when.
 */
export const Open: Story = {}

/**
 * The closed ones, under their own heading.
 */
export const Closed: Story = {
  args: { cases: cases.filter((item) => item.isClosed), title: "Avslutade" },
}

/**
 * On one person's page the rows leave out who they are about, since the page says.
 */
export const AboutOnePerson: Story = {
  args: { isAboutShown: false },
}

/**
 * Before the names arrive, each row names its person by member number.
 */
export const NamesOnTheirWay: Story = {
  args: { people: undefined },
}
