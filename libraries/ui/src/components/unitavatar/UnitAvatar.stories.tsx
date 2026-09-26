import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"

import { UnitIdentitiesProvider } from "../../foundations/units/UnitIdentities"
import { UnitAvatar } from "./UnitAvatar"

/**
 * A stand-in glyph, inlined because nothing in Storybook touches a network – the
 * units' own marks are files the application serves.
 */
const starGlyph = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12 2l2.9 6.26L21 9.27l-4.5 4.38L17.8 20 12 16.77 6.2 20l1.3-6.35L3 9.27l6.1-1.01z"/></svg>',
)}`

const withGlyphs: Decorator = (Story) => (
  <UnitIdentitiesProvider identities={{ glyphSrc: () => starGlyph, name: () => "Stjärnan" }}>
    <Story />
  </UnitIdentitiesProvider>
)

const meta: Meta<typeof UnitAvatar> = {
  title: "Components/UnitAvatar",
  component: UnitAvatar,
}

export default meta

type Story = StoryObj<typeof UnitAvatar>

/**
 * Every palette with a stand-in glyph, at row size – the units shown happen to cover
 * every color.
 */
export const WithGlyph: Story = {
  decorators: [withGlyphs],
  render: () => (
    <div className="story-samples">
      {[1, 2, 4, 6, 10].map((unit) => (
        <UnitAvatar key={unit} unitNumber={unit} />
      ))}
    </div>
  ),
}

/**
 * Before the identities are loaded the disc carries the number, in the same dress.
 */
export const NumberFallback: Story = {
  render: () => (
    <div className="story-samples">
      {[1, 2, 4, 6, 10].map((unit) => (
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
  decorators: [withGlyphs],
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
  decorators: [withGlyphs],
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
  decorators: [withGlyphs],
  render: () => <UnitAvatar size="profile" unitNumber={30} />,
}
