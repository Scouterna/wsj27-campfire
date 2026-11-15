import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { ChangeBadge } from "./ChangeBadge"

// A fixed moment, so every age reads the same whatever day the catalog is opened.
const now = new Date("2026-09-30T12:00:00+02:00")

/**
 * The moment a number of days before the catalog's fixed now.
 * @param days How many days ago.
 * @returns The moment, as an ISO 8601 instant.
 */
function daysAgo(days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

const meta: Meta<typeof ChangeBadge> = {
  title: "Modules/Handbook/Components/ChangeBadge",
  component: ChangeBadge,
  args: { label: "Uppdaterad", now },
}

export default meta

type Story = StoryObj<typeof ChangeBadge>

export const Fresh: Story = {
  args: { at: daysAgo(2) },
}

export const Recent: Story = {
  args: { at: daysAgo(10) },
}

export const Fading: Story = {
  args: { at: daysAgo(20) },
}

export const Settled: Story = {
  args: { at: daysAgo(45) },
}

export const EveryAge: Story = {
  render: () => (
    <div className="chips">
      {[2, 10, 20, 45].map((days) => (
        <ChangeBadge key={days} at={daysAgo(days)} label="Uppdaterad" now={now} />
      ))}
    </div>
  ),
}

export const OpensItsNote: Story = {
  render: function Render() {
    const [isOpen, setOpen] = useState(false)
    return (
      <ChangeBadge
        at={daysAgo(2)}
        controls="note"
        isOpen={isOpen}
        label="Uppdaterad"
        now={now}
        onToggle={() => {
          setOpen((open) => !open)
        }}
      />
    )
  },
}
