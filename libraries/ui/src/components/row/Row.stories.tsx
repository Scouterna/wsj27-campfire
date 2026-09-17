import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Card } from "../card/Card"
import { Row } from "./Row"

const meta: Meta<typeof Row> = {
  title: "Components/Row",
  component: Row,
}

export default meta

type Story = StoryObj<typeof Row>

const tile = (initials: string): ReactElement => <span className="story-tile">{initials}</span>

/**
 * A list of people on a card: the rows bleed to the card's edges, dividers between
 * them, each led by its tile.
 */
export const InACard: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <Row leading={tile("LL")}>
          <strong>Lars Lindberg</strong>
          <small>Avdelning 1 · Ledare</small>
        </Row>
        <Row leading={tile("AA")}>
          <strong>Anna Almgren</strong>
          <small>Kontingentledningen · Administration</small>
        </Row>
        <Row leading={tile("PP")}>
          <strong>Pernilla Palm</strong>
          <small>Kontingentledningen · Program</small>
        </Row>
      </Card>
    </div>
  ),
}

/**
 * A row that navigates carries the chevron and lights up on hover – the address lands
 * back on the story, through the catalog's own router.
 */
export const Linked: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <Row leading={tile("LL")} link={{ to: "/" }}>
          <strong>Lars Lindberg</strong>
          <small>Avdelning 1 · Ledare</small>
        </Row>
        <Row leading={tile("AA")} link={{ to: "/" }}>
          <strong>Anna Almgren</strong>
          <small>Kontingentledningen · Administration</small>
        </Row>
      </Card>
    </div>
  ),
}

/**
 * The trailing slot, when the row ends in a fact rather than a way onward.
 */
export const WithTrailing: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <Row leading={tile("KK")} trailing={<small>i går</small>}>
          <strong>Karin Kron</strong>
          <small>Kontingentledare</small>
        </Row>
      </Card>
    </div>
  ),
}
