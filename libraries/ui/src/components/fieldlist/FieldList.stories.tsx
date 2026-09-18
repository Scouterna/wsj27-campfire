import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Card } from "../card/Card"
import { FieldList } from "./FieldList"

const meta: Meta<typeof FieldList> = {
  title: "Components/FieldList",
  component: FieldList,
}

export default meta

type Story = StoryObj<typeof FieldList>

/**
 * Plain pairs, the way a record's registration facts are listed.
 */
export const Pairs: Story = {
  args: {
    fields: [
      { label: "Typ av anmälan", value: "Ledare" },
      { label: "Avdelning", value: "Avdelning 3" },
      { label: "Typ av resa", value: "Rundresa" },
      { label: "Medlemsnummer", value: "1100101" },
    ],
  },
}

/**
 * The quoted line, where a value carries the person's own words under it.
 */
export const WithQuotes: Story = {
  args: {
    fields: [
      { label: "Receptbelagda läkemedel", value: "Levaxin 100 µg" },
      {
        label: "Medicinsk utrustning",
        quote: "Insulinpennorna behöver stå i kylskåp mellan måltiderna.",
        value: "Kylförvaring av medicin",
      },
      { label: "Hjälpmedel", quote: "Efter en knäoperation i våras.", value: "Kryckor" },
    ],
  },
}

/**
 * Inside a card, which is where the list is always drawn.
 */
export const InACard: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card title="Profil">
        <FieldList
          fields={[
            { label: "Typ av anmälan", value: "Deltagare" },
            { label: "Avdelning", value: "Avdelning 12" },
            { label: "Typ av resa", value: "Direktresa" },
          ]}
        />
      </Card>
    </div>
  ),
}
