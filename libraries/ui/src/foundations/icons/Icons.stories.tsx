import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import type { IconProps } from "./IconProps"
import { BackIcon } from "./set/BackIcon"
import { ChatIcon } from "./set/ChatIcon"
import { CheckIcon } from "./set/CheckIcon"
import { HomeIcon } from "./set/HomeIcon"
import { IdCardIcon } from "./set/IdCardIcon"
import { MailIcon } from "./set/MailIcon"
import { MoreIcon } from "./set/MoreIcon"
import { ParticipantsIcon } from "./set/ParticipantsIcon"
import { PhoneIcon } from "./set/PhoneIcon"
import { SearchIcon } from "./set/SearchIcon"

const meta: Meta = {
  title: "Foundations/Icons",
}

export default meta

const icons: readonly (readonly [string, (props: IconProps) => ReactElement])[] = [
  ["Back", BackIcon],
  ["Chat", ChatIcon],
  ["Check", CheckIcon],
  ["Home", HomeIcon],
  ["Id card", IdCardIcon],
  ["Mail", MailIcon],
  ["More", MoreIcon],
  ["Participants", ParticipantsIcon],
  ["Phone", PhoneIcon],
  ["Search", SearchIcon],
]

/**
 * The whole set, at the 24-point size the grid is drawn on. The set grows with the
 * screens that draw more.
 */
export const All: StoryObj = {
  render: (): ReactElement => (
    <div className="story-icons">
      {icons.map(([name, Icon]) => (
        <div key={name} className="story-icon">
          <span className="story-icon-mark">
            <Icon />
          </span>
          <div className="story-icon-name">{name}</div>
        </div>
      ))}
    </div>
  ),
}

const samples: readonly { readonly size: number; readonly strokeWidth: number }[] = [
  { size: 16, strokeWidth: 2 },
  { size: 22, strokeWidth: 2 },
  { size: 22, strokeWidth: 2.4 },
  { size: 34, strokeWidth: 1.4 },
  { size: 48, strokeWidth: 2.1 },
]

/**
 * The two knobs every icon carries: the size it draws itself at, and the weight of its
 * line – thickened where an icon is the active one, thinned where it sits behind text.
 */
export const SizeAndWeight: StoryObj = {
  render: (): ReactElement => (
    <div className="story-samples">
      {samples.map(({ size, strokeWidth }) => (
        <div key={`${String(size)}-${String(strokeWidth)}`} className="story-sample">
          <ParticipantsIcon size={size} strokeWidth={strokeWidth} />
          <div className="story-icon-name">
            {size} / {strokeWidth}
          </div>
        </div>
      ))}
    </div>
  ),
}
