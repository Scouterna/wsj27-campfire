import type { Meta, StoryObj } from "@storybook/react-vite"

import { UnitAvatar } from "./UnitAvatar"

const meta: Meta<typeof UnitAvatar> = {
  title: "Components/UnitAvatar",
  component: UnitAvatar,
}

export default meta

type Story = StoryObj<typeof UnitAvatar>

/**
 * Every palette with its unit's glyph, at row size – the units shown happen to cover
 * every color.
 */
export const WithGlyph: Story = {
  render: () => (
    <div className="story-samples">
      {[1, 2, 4, 6, 10].map((unit) => (
        <UnitAvatar key={unit} unitNumber={unit} />
      ))}
    </div>
  ),
}

/**
 * Every glyph there is – the units', then the IST's and the management's.
 */
export const EveryGlyph: Story = {
  render: () => (
    <div className="story-samples">
      {Array.from({ length: 55 }, (_, index) => (
        <UnitAvatar key={index} unitNumber={index + 1} />
      ))}
    </div>
  ),
}

/**
 * A number with no glyph of its own carries the number on the disc, in the same dress.
 */
export const NumberFallback: Story = {
  render: () => (
    <div className="story-samples">
      {[56, 99].map((unit) => (
        <UnitAvatar key={unit} unitNumber={unit} />
      ))}
    </div>
  ),
}

/**
 * The slots beyond the units, the IST's and the management's, in the surrounding theme
 * like every mark.
 */
export const IstAndCmt: Story = {
  render: () => (
    <div className="story-samples">
      <UnitAvatar unitNumber={54} />
      <UnitAvatar unitNumber={55} />
    </div>
  ),
}

/**
 * A unit leader's copy: the unit's star in a notch cut from the mark's corner.
 */
export const Leader: Story = {
  render: () => (
    <div className="story-samples">
      <UnitAvatar isLeader unitNumber={1} />
      <UnitAvatar isLeader size="profile" unitNumber={30} />
    </div>
  ),
}

/**
 * The profile header's size.
 */
export const Profile: Story = {
  render: () => <UnitAvatar size="profile" unitNumber={30} />,
}
